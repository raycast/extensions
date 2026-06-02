import { useState, useEffect, useCallback } from "react";
import { getPreferenceValues } from "@raycast/api";
import { cache } from "../helpers";

export interface FilterState {
  browserFilter: string;
  setBrowserFilter: (value: string) => void;
  windowFilters: Record<string, string>;
  setWindowFilterForBrowser: (browser: string, windowId: string) => void;
  currentWindowFilter: string;
  includeAllWindows: boolean;
}

/**
 * Manages persistence and basic state for filters.
 * Returns the current state and setters.
 */
export function usePersistentState(): FilterState {
  const preferences = getPreferenceValues();
  const includeAllWindows = preferences.includeAllWindows === true;

  // Browser filter state
  const [browserFilter, setBrowserFilter] = useState<string>(
    () => cache.get("browser_filter") || "all",
  );

  // Window filter state (per-browser)
  const [windowFilters, setWindowFilters] = useState<Record<string, string>>(
    () => {
      const saved = cache.get("window_filters");
      return saved ? JSON.parse(saved) : {};
    },
  );

  // Derived current window filter
  const rawWindowFilter = windowFilters[browserFilter];
  const currentWindowFilter = rawWindowFilter || "all";

  // Persist browser filter
  useEffect(() => {
    const existing = cache.get("browser_filter");
    if (existing !== browserFilter) {
      cache.set("browser_filter", browserFilter);
    }
  }, [browserFilter]);

  // Set window filter for a specific browser
  const setWindowFilterForBrowser = useCallback(
    (browser: string, windowId: string) => {
      setWindowFilters((prev) => {
        const next = { ...prev, [browser]: windowId };
        cache.set("window_filters", JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  return {
    browserFilter,
    setBrowserFilter,
    windowFilters,
    setWindowFilterForBrowser,
    currentWindowFilter,
    includeAllWindows,
  };
}

/**
 * Handles validation of filter state against available browser data.
 * Must be called AFTER useBrowser to access availableBrowsers and windowsByBrowser.
 */
export function useFilterValidation(
  availableBrowsers: string[],
  windowsByBrowser: Record<string, { id: string; name: string }[]>,
  state: FilterState,
) {
  const {
    browserFilter,
    setBrowserFilter,
    currentWindowFilter,
    includeAllWindows,
    setWindowFilterForBrowser,
  } = state;

  // Safety Guard: Reset browser filter if selected browser is no longer available
  useEffect(() => {
    if (
      browserFilter !== "all" &&
      availableBrowsers.length > 0 &&
      !availableBrowsers.includes(browserFilter)
    ) {
      console.log(
        `[Switch Tabs] Selected browser '${browserFilter}' is offline. Resetting filter to 'all'.`,
      );
      setBrowserFilter("all");
    }
  }, [availableBrowsers, browserFilter, setBrowserFilter]);

  // Safety Guard: Reset window filter if selected window is no longer available
  useEffect(() => {
    if (availableBrowsers.length === 0) return;

    const windows = windowsByBrowser[browserFilter] || [];
    if (windows.length === 0) return;

    const isCurrentValid =
      currentWindowFilter === "all"
        ? includeAllWindows
        : windows.some((w) => w.id === currentWindowFilter);

    if (!isCurrentValid) {
      const resetValue = includeAllWindows ? "all" : windows[0]?.id || "all";
      if (currentWindowFilter !== resetValue) {
        console.log(
          `[Switch Tabs] Window reset: current '${currentWindowFilter}' invalid. Available for '${browserFilter}': [${windows.map((w) => w.id).join(", ")}]. Resetting to '${resetValue}'.`,
        );
        setWindowFilterForBrowser(browserFilter, resetValue);
      }
    }
  }, [
    windowsByBrowser,
    browserFilter,
    currentWindowFilter,
    setWindowFilterForBrowser,
    includeAllWindows,
    availableBrowsers,
  ]);
}
