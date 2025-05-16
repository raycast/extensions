import { LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import { Resolution } from "../types";

export function useStarredResolutions() {
  const [starredResolutions, setStarredResolutions] = useState<Resolution[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
      }
    }

    loadStarredResolutions();
  }, [refreshTrigger]);

  // Function to toggle star status
  async function toggleStarResolution(resolution: Resolution) {
    try {
      const isStarred = starredResolutions.some((r) => r.width === resolution.width && r.height === resolution.height);
      const updatedResolutions = isStarred
        ? starredResolutions.filter((r) => !(r.width === resolution.width && r.height === resolution.height))
        : [...starredResolutions, { ...resolution, isStarred: true }];

      setStarredResolutions(updatedResolutions);
      await LocalStorage.setItem("starred-resolutions", JSON.stringify(updatedResolutions));
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
  };
}
