import { useState, useEffect } from "react";
import { LocalStorage, getPreferenceValues } from "@raycast/api";

export type ViewMode = "grid" | "list";

const VIEW_MODE_KEY = "somafm-view-mode";

interface Preferences {
  defaultView?: ViewMode;
}

export function useViewMode() {
  const preferences = getPreferenceValues<Preferences>();
  const [viewMode, setViewMode] = useState<ViewMode>(preferences.defaultView || "grid");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadViewMode();
  }, []);

  async function loadViewMode() {
    try {
      const stored = await LocalStorage.getItem<string>(VIEW_MODE_KEY);
      if (stored === "list" || stored === "grid") {
        setViewMode(stored);
      }
    } catch (error) {
      console.error("Failed to load view mode:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleViewMode() {
    const newMode: ViewMode = viewMode === "grid" ? "list" : "grid";
    setViewMode(newMode);
    try {
      await LocalStorage.setItem(VIEW_MODE_KEY, newMode);
    } catch (error) {
      console.error("Failed to save view mode:", error);
    }
  }

  return {
    viewMode,
    isLoading,
    toggleViewMode,
  };
}
