import { LocalStorage, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { Resolution } from "../types";
import { isSameResolution } from "../utils/resolution";

export function useStarredResolutions() {
  const [starredResolutions, setStarredResolutions] = useState<Resolution[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Load starred resolutions
  useEffect(() => {
    async function loadStarredResolutions() {
      try {
        const storedResolutions = await LocalStorage.getItem<string>("starred-resolutions");
        if (storedResolutions) {
          const parsedResolutions = JSON.parse(storedResolutions);
          // Add isStarred=true to all starred resolutions
          setStarredResolutions(
            parsedResolutions.map((resolution: Resolution) => ({
              ...resolution,
              isStarred: true,
            })),
          );
        }
      } catch (error) {
        console.error("Error loading starred resolutions:", error);
        await showFailureToast({
          title: "Failed to load starred resolutions",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadStarredResolutions();
  }, [refreshTrigger]);

  // Check if a resolution is starred
  async function isResolutionStarred(resolution: Resolution): Promise<boolean> {
    try {
      const storedResolutions = await LocalStorage.getItem<string>("starred-resolutions");
      if (!storedResolutions) return false;

      const parsedResolutions = JSON.parse(storedResolutions);
      return parsedResolutions.some((r: Resolution) => isSameResolution(r, resolution));
    } catch (error) {
      console.error("Error checking if resolution is starred:", error);
      await showFailureToast({
        title: "Failed to check starred status",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
      return false;
    }
  }

  // Remove a resolution from starred list
  async function removeStarredResolution(resolution: Resolution): Promise<void> {
    try {
      const storedResolutions = await LocalStorage.getItem<string>("starred-resolutions");
      if (!storedResolutions) return;

      const parsedResolutions = JSON.parse(storedResolutions);
      const updatedResolutions = parsedResolutions.filter((r: Resolution) => !isSameResolution(r, resolution));

      // First ensure storage update succeeds
      await LocalStorage.setItem("starred-resolutions", JSON.stringify(updatedResolutions));

      // Only refresh after storage is confirmed
      refreshStarredResolutions();
    } catch (error) {
      console.error("Error removing starred resolution:", error);
      await showFailureToast({
        title: "Failed to remove starred resolution",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  }

  // Function to toggle star status
  async function toggleStarResolution(resolution: Resolution) {
    const isStarred = starredResolutions.some((r) => isSameResolution(r, resolution));
    try {
      const updatedResolutions = isStarred
        ? starredResolutions.filter((r) => !isSameResolution(r, resolution))
        : [...starredResolutions, { ...resolution, isStarred: true }];

      // First ensure storage update succeeds
      await LocalStorage.setItem("starred-resolutions", JSON.stringify(updatedResolutions));

      // Only update state after storage is confirmed
      setStarredResolutions(updatedResolutions);

      // Show toast notification
      await showToast({
        style: Toast.Style.Success,
        title: isStarred ? "Removed from Starred Sizes" : "Marked as Starred",
      });
    } catch (error) {
      console.error("Error toggling star status:", error);
      throw error;
    }
  }

  // Refresh starred resolutions list
  function refreshStarredResolutions() {
    setRefreshTrigger((prev) => prev + 1);
  }

  return {
    starredResolutions,
    toggleStarResolution,
    refreshStarredResolutions,
    isResolutionStarred,
    removeStarredResolution,
    isLoading,
  };
}
