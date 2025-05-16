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
          setStarredResolutions(JSON.parse(storedResolutions));
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
      const updatedResolution = { ...resolution, isStarred: !resolution.isStarred };
      const updatedResolutions = resolution.isStarred
        ? starredResolutions.filter((r) => r.title !== resolution.title)
        : [...starredResolutions, updatedResolution];

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
