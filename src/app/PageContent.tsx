"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";

// Main App component
const PageContent: React.FC = () => {
    // useRef for video and canvas elements to directly interact with DOM elements
    // Specify the type of HTML element the ref will attach to, and initialize with null
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // useState to manage the camera stream, captured image data, and messages
    // Specify the type for each state variable
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [message, setMessage] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false); // For loading indicator during send
    const [processedImage, setProcessedImage] = useState<string | null>(null);

    const startCamera = useCallback(async (): Promise<void> => {
        try {
            // Request access to user's media devices (video only)
            const mediaStream: MediaStream =
                await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { exact: "environment" } },
                });
            setStream(mediaStream); // Store the stream in state

            // Attach the stream to the video element
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.play(); // Start playing the video
                setMessage("Camera started successfully.");
            }
        } catch (error: unknown) {
            // Use 'any' for error type if not specific, or 'DOMException'
            // Handle errors if camera access is denied or not available
            console.error("Error accessing camera:", error);
            setMessage(
                "Failed to access camera. Please ensure you have a camera and grant permissions."
            );
        }
    }, []);

    // useEffect to handle camera access when the component mounts and clean up when it unmounts
    useEffect(() => {
        // Function to start the camera
        startCamera(); // Call startCamera when the component mounts

        // Cleanup function: stop camera tracks when the component unmounts
        return () => {
            if (stream) {
                stream
                    .getTracks()
                    .forEach((track: MediaStreamTrack) => track.stop()); // Stop all tracks in the stream
            }
        };
    }, []); // Dependency array: re-run if stream changes (though it typically won't after initial setup)

    // Function to take a photo from the video feed
    const takePhoto = (): void => {
        if (videoRef.current && canvasRef.current) {
            const video: HTMLVideoElement = videoRef.current;
            const canvas: HTMLCanvasElement = canvasRef.current;

            // Set canvas dimensions to match video dimensions
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Get 2D rendering context of the canvas
            // Ensure context is not null before proceeding
            const context: CanvasRenderingContext2D | null =
                canvas.getContext("2d");
            if (context) {
                // Draw the current frame of the video onto the canvas
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Get the image data as a base64 encoded PNG
                const imageData: string = canvas.toDataURL("image/png");
                setCapturedImage(imageData); // Store the captured image data in state
                setProcessedImage(null)
                setMessage("Photo captured! You can now send it.");
            } else {
                setMessage("Failed to get canvas context.");
            }
        } else {
            setMessage("Camera not ready or elements not found.");
        }
    };

    // Function to simulate sending the photo to an endpoint
    const sendPhoto = async (): Promise<void> => {
        if (!capturedImage) {
            setMessage("No photo to send. Please capture a photo first.");
            return;
        }

        setIsLoading(true); // Show loading indicator
        setMessage("Sending photo...");

        try {
            // Convert base64 image data to a Blob
            const response = await fetch(capturedImage);
            const blob = await response.blob();

            // Create FormData object
            const formData = new FormData();
            // Append the image Blob to FormData with a file name (e.g., 'image.png')
            // The key 'image' should match what your backend endpoint expects for the file.
            formData.append("image", blob, "camera_capture.png");

            // --- Placeholder for actual API call ---
            // Replace '/api/upload-image' with your actual endpoint
            // Note: When sending FormData, the 'Content-Type' header is automatically set by the browser
            // to 'multipart/form-data' with the correct boundary, so you don't set it manually.
            const apiResponse = await fetch(
                "https://lately-main-oryx.ngrok-free.app/process_image",
                {
                    method: "POST",
                    body: formData, // Send the FormData object directly
                }
            );
            //
            if (apiResponse.ok) {
                const result = await apiResponse.json();
                console.log(result);
                const imageBase64 = result.processed_image_base64;
                const processedImage = "data:image/jpeg;base64," + imageBase64;
                setProcessedImage(processedImage);
                console.log(processedImage);

                setMessage(
                    `Photo sent successfully! Server response: OK`
                );
            } else {
                setMessage(`Failed to send photo: ${apiResponse.statusText}`);
            }

            // setMessage(
            //     "Photo sent successfully (simulated)! Check console for FormData info."
            // );
            setCapturedImage(null); // Clear captured image after sending
        } catch (error: unknown) {
            console.error("Error sending photo:", error);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setMessage((error as any).toString());
        } finally {
            setIsLoading(false); // Hide loading indicator
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 font-sans">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 rounded-lg p-2 bg-white shadow-md">
                Coffee Segmentation
            </h1>

            <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
                {/* Video element to display camera feed */}
                <div className="relative w-full h-128 bg-gray-200 rounded-lg overflow-hidden mb-4 border-2 border-gray-300">
                    <div className="absolute top-[50%] left-[50%] w-[56px] h-[56px] -translate-1/2 border border-white z-10" ></div>
                    <video
                        ref={videoRef}
                        className="absolute top-0 left-0 w-full h-full object-cover rounded-lg"
                        autoPlay
                        playsInline
                        muted
                    ></video>
                    {!stream && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 text-white text-lg rounded-lg">
                            Loading Camera...
                        </div>
                    )}
                </div>

                {/* Buttons for actions */}
                <div className="flex justify-center space-x-4 mb-4">
                    <button
                        onClick={takePhoto}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75"
                        disabled={!stream} // Disable if camera stream is not available
                    >
                        Capture Photo
                    </button>
                    <button
                        onClick={sendPhoto}
                        className={`py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-opacity-75
              ${
                  capturedImage && !isLoading
                      ? "bg-green-500 hover:bg-green-600 text-white focus:ring-green-400"
                      : "bg-gray-400 text-gray-700 cursor-not-allowed"
              }`}
                        disabled={!capturedImage || isLoading} // Disable if no image or loading
                    >
                        {isLoading ? "Sending..." : "Send Photo"}
                    </button>
                </div>

                {/* Message display area */}
                {message && (
                    <p className="text-center text-sm text-gray-600 mt-2 p-2 bg-gray-50 rounded-md">
                        {message}
                    </p>
                )}

                {/* Display captured image if available */}
                {capturedImage && (
                    <div className="mt-6 text-center">
                        <h2 className="text-xl font-semibold text-gray-700 mb-3">
                            Captured Image:
                        </h2>
                        <img
                            src={capturedImage}
                            alt="Captured"
                            className="max-w-full h-auto rounded-lg shadow-md border-2 border-gray-300 mx-auto"
                        />
                    </div>
                )}
                {processedImage && (
                    <div className="mt-6 text-center">
                        <h2 className="text-xl font-semibold text-gray-700 mb-3">
                            Processed Image:
                        </h2>
                        <img
                            src={processedImage}
                            alt="Captured"
                            className="max-w-full h-auto rounded-lg shadow-md border-2 border-gray-300 mx-auto"
                        />
                    </div>
                )}

                {/* Hidden canvas for image processing */}
                <canvas ref={canvasRef} className="hidden"></canvas>
            </div>
        </div>
    );
};

export default PageContent;
