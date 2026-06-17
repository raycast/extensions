import { showToast, Toast, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import { Resolution } from "../types";

export function useCustomResolutions() {
  const [isLoading, setIsLoading] = useState(true);
  const [customResolutions, setCustomResolutions] = useState<Resolution[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load custom resolutions
  useEffect(() => {
    async function loadCustomResolutions() {
      try {
        const storedResolutions = await LocalStorage.getItem<string>("custom-resolutions");
        if (storedResolutions) {
          setCustomResolutions(JSON.parse(storedResolutions));
        }
      } catch (error) {
        console.error("Error loading custom resolutions:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadCustomResolutions();
  }, [refreshTrigger]);

  // Function to delete a custom resolution
  async function deleteCustomResolution(resolution: Resolution) {
    try {
      const updatedResolutions = customResolutions.filter((r) => r.title !== resolution.title);
      setCustomResolutions(updatedResolutions);
      await LocalStorage.setItem("custom-resolutions", JSON.stringify(updatedResolutions));

      // Show toast notification for successful deletion
      await showToast({
        style: Toast.Style.Success,
        title: "Size deleted",
      });
    } catch (error) {
      console.error("Error deleting custom resolution:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error deleting size",
      });
    }
  }

  // Refresh custom resolutions list
  function refreshCustomResolutions() {
    setRefreshTrigger((prev) => prev + 1);
  }

  return {
    isLoading,
    customResolutions,
    deleteCustomResolution,
    refreshCustomResolutions,
  };
}
