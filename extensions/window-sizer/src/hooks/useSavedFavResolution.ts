import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { useWindowInfo } from "./useWindowInfo";

interface SavedResolution {
  width: number;
  height: number;
}

export function useSavedFavResolution() {
  const [savedResolution, setSavedResolution] = useState<SavedResolution | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { getWindowInfo } = useWindowInfo();

  // Load saved resolution on mount
  useEffect(() => {
    async function loadSavedResolution() {
      try {
        const storedResolution = await LocalStorage.getItem<string>("saved-fav-resolution");
        if (storedResolution) {
          setSavedResolution(JSON.parse(storedResolution));
        }
      } catch (error) {
        console.error("Error loading saved resolution:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load saved size",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadSavedResolution();
  }, []);

  // Save new resolution
  async function saveResolution(width: number, height: number) {
    try {
      const newResolution = { width, height };
      await LocalStorage.setItem("saved-fav-resolution", JSON.stringify(newResolution));
      setSavedResolution(newResolution);

      // Check if current window size matches the new size
      const windowInfo = await getWindowInfo();
      if (windowInfo && windowInfo.width === width && windowInfo.height === height) {
        await showToast({
          style: Toast.Style.Success,
          title: "Size saved",
        });
      }
    } catch (error) {
      console.error("Error saving resolution:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save size",
      });
    }
  }

  // Clear saved resolution
  async function clearSavedResolution() {
    try {
      await LocalStorage.removeItem("saved-fav-resolution");
      setSavedResolution(null);

      await showToast({
        style: Toast.Style.Success,
        title: "Saved size cleared",
      });
    } catch (error) {
      console.error("Error clearing saved resolution:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to clear saved size",
      });
    }
  }

  return {
    savedResolution,
    isLoading,
    saveResolution,
    clearSavedResolution,
  };
}
