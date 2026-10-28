import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { ExtensionPreferences, ViewMode } from "../types";

const STORAGE_KEY = "photoshop_projects_view_mode";

export function useViewMode() {
  const prefs = getPreferenceValues<ExtensionPreferences>();
  const [viewMode, setViewMode] = useState<ViewMode>(prefs.defaultViewMode || "grid");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSaved() {
      try {
        const saved = await LocalStorage.getItem<string>(STORAGE_KEY);
        if (saved === "grid" || saved === "list") {
          setViewMode(saved);
        }
      } catch (error) {
        void error;
      } finally {
        setIsLoading(false);
      }
    }
    loadSaved();
  }, []);

  const setExplicitViewMode = async (mode: ViewMode) => {
    setViewMode(mode);
    await LocalStorage.setItem(STORAGE_KEY, mode);
  };

  const toggleViewMode = async () => {
    const next: ViewMode = viewMode === "grid" ? "list" : "grid";
    await setExplicitViewMode(next);
  };

  const columns = parseInt(prefs.gridColumns || "5", 10);

  return {
    viewMode,
    setViewMode: setExplicitViewMode,
    toggleViewMode,
    isLoadingViewMode: isLoading,
    columns,
  };
}
