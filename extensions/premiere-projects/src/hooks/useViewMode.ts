import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useEffect } from "react";
import { ViewMode } from "../types";

const VIEW_MODE_STORAGE_KEY = "premiere_preferred_view_mode";

export function useViewMode() {
  const prefs = getPreferenceValues<Preferences>();
  const defaultMode: ViewMode = prefs.defaultViewMode || "grid";
  const configuredColumns = parseInt(prefs.gridColumns || "5", 10);

  useEffect(() => {
    async function migrateLegacyStorage() {
      try {
        const item = await LocalStorage.getItem(VIEW_MODE_STORAGE_KEY);
        if (typeof item === "string") {
          try {
            JSON.parse(item);
          } catch {
            await LocalStorage.setItem(VIEW_MODE_STORAGE_KEY, JSON.stringify(item));
          }
        }
      } catch {
        // Non-blocking
      }
    }
    migrateLegacyStorage();
  }, []);

  const { value: viewMode = defaultMode, setValue: setViewMode } = useLocalStorage<ViewMode>(
    VIEW_MODE_STORAGE_KEY,
    defaultMode,
  );

  const toggleViewMode = () => {
    const next: ViewMode = viewMode === "grid" ? "list" : "grid";
    setViewMode(next);
  };

  return {
    viewMode,
    setViewMode,
    toggleViewMode,
    columns: configuredColumns,
  };
}
