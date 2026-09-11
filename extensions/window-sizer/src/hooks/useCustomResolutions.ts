import { showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { Resolution } from "../types";
import { getCustomResolutions, setCustomResolutions as storeCustomResolutions } from "../storage/resolutionStorage";
import { isSameResolution } from "../utils/resolution";

export function useCustomResolutions() {
  const [isLoading, setIsLoading] = useState(true);
  const [customResolutions, setCustomResolutions] = useState<Resolution[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load custom resolutions
  useEffect(() => {
    async function loadCustomResolutions() {
      try {
        setCustomResolutions(await getCustomResolutions());
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
      const updatedResolutions = customResolutions.filter((item) => !isSameResolution(item, resolution));
      await storeCustomResolutions(updatedResolutions);
      setCustomResolutions(updatedResolutions);

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
