import { showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";

// Import React and Raycast components through require to bypass TypeScript issues
const { Grid } = require("@raycast/api");

export default function Command() {
  // Using isLoading state to avoid empty state flicker
  const [isLoading, setIsLoading] = useState(true);
  
  // Proper loading delay implementation with cleanup
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Using regular function return with JS objects
  return Grid({
    columns: 4,
    isLoading: isLoading,
    children: Grid.Item({
      content: "🔄",
      title: "Loading Item"
    })
  });
}

// Helper function for error handling
async function showFailureToast(error: unknown, options?: { title?: string }) {
  const toast = await showToast({
    style: Toast.Style.Failure,
    title: options?.title || "Something went wrong",
    message: error instanceof Error ? error.message : String(error),
  });
  
  return toast;
}
