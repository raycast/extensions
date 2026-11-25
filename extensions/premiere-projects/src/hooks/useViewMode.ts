import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { ExtensionPreferences, ViewMode } from "../types";

const VIEW_MODE_STORAGE_KEY = "premiere_preferred_view_mode";

export function useViewMode() {
  const prefs = getPreferenceValues<ExtensionPreferences>();
  const defaultMode = prefs.defaultViewMode || "grid";
  const configuredColumns = parseInt(prefs.gridColumns || "5", 10);

  const [viewMode, setViewModeState] = useState<ViewMode>(defaultMode);

  useEffect(() => {
    async function loadSavedViewMode() {
      try {
        const saved = await LocalStorage.getItem<string>(VIEW_MODE_STORAGE_KEY);
        if (saved === "grid" || saved === "list") {
          setViewModeState(saved);
        }
      } catch {
        // Fallback to defaultMode
      }
    }
    loadSavedViewMode();
  }, []);

  const setViewMode = async (mode: ViewMode) => {
    setViewModeState(mode);
    try {
      await LocalStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch {
      // Non-blocking
    }
  };

  const toggleViewMode = () => {
    const next = viewMode === "grid" ? "list" : "grid";
    setViewMode(next);
  };

  return {
    viewMode,
    setViewMode,
    toggleViewMode,
    columns: configuredColumns,
  };
}
