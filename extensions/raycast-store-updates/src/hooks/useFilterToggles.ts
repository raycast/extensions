import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";

const FILTER_KEY = "filter-toggles";

export interface FilterToggles {
  showMacOS: boolean;
  showWindows: boolean;
}

const DEFAULT_TOGGLES: FilterToggles = {
  showMacOS: true,
  showWindows: true,
};

/**
 * Hook to manage persistent platform filter toggles.
 * Stored in LocalStorage so they persist between sessions.
 */
export function useFilterToggles() {
  const [toggles, setToggles] = useState<FilterToggles>(DEFAULT_TOGGLES);
  const [loaded, setLoaded] = useState(false);

  // Load from LocalStorage on mount
  useEffect(() => {
    LocalStorage.getItem<string>(FILTER_KEY).then((stored) => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as Partial<FilterToggles>;
          setToggles({ ...DEFAULT_TOGGLES, ...parsed });
        } catch {
          // ignore
        }
      }
      setLoaded(true);
    });
  }, []);

  const persist = useCallback(async (updated: FilterToggles) => {
    await LocalStorage.setItem(FILTER_KEY, JSON.stringify(updated));
  }, []);

  const toggleMacOS = useCallback(async () => {
    setToggles((prev) => {
      const updated = { ...prev, showMacOS: !prev.showMacOS };
      // Ensure at least one platform is enabled
      if (!updated.showMacOS && !updated.showWindows) {
        updated.showWindows = true;
      }
      persist(updated);
      showToast({
        style: Toast.Style.Success,
        title: updated.showMacOS ? "Showing macOS-only extensions" : "Hiding macOS-only extensions",
      });
      return updated;
    });
  }, [persist]);

  const toggleWindows = useCallback(async () => {
    setToggles((prev) => {
      const updated = { ...prev, showWindows: !prev.showWindows };
      // Ensure at least one platform is enabled
      if (!updated.showWindows && !updated.showMacOS) {
        updated.showMacOS = true;
      }
      persist(updated);
      showToast({
        style: Toast.Style.Success,
        title: updated.showWindows ? "Showing Windows-only extensions" : "Hiding Windows-only extensions",
      });
      return updated;
    });
  }, [persist]);

  return {
    toggles,
    loaded,
    toggleMacOS,
    toggleWindows,
  };
}
