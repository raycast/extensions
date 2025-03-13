import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Application, getFrontmostApplication, showHUD } from "@raycast/api";
import { MenusConfig } from "../types";
import {
  getMenuBarShortcutsApplescript,
  getMenuBarShortcutsCache,
  getTotalMenuBarItemsApplescript,
} from "../utils";

export function useMenuItemsLoader() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MenusConfig>();
  const [app, setApp] = useState<Application>();
  const [totalMenuItems, setTotalMenuItems] = useState<number>(0);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState<string | null>(null);
  const [loadingFromAppleScript, setLoadingFromAppleScript] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const initialLoadRef = useRef(true); // Track if this is the first load
  const abortControllerRef = useRef<AbortController | null>(null);

  // Handle initial validation and setup
  const setupLoadingOperation = useCallback(() => {
    // Cancel any pending operations
    if (abortControllerRef.current) abortControllerRef.current.abort();

    // Create new abort controller for this operation
    abortControllerRef.current = new AbortController();

    // Reset loading states
    setLoading(true);
    setLoadingFromAppleScript(false);
    setLoadingMessage(null);
    setLoadingState(null);

    return abortControllerRef.current.signal;
  }, []);

  // Check if we need to reload data
  const shouldReloadData = useCallback(
    (frontmostApp: Application, refresh?: "app" | "data") => {
      // only reload if user is hard refreshing
      // or the focused app has changed
      // or the initial load hasn't completed
      return (
        refresh || frontmostApp?.name !== app?.name || initialLoadRef.current
      );
    },
    [app],
  );

  // Cache loading handler
  const tryLoadFromCache = useCallback(
    async (frontmostApp: Application, refresh?: "app" | "data") => {
      if (refresh === "data") return false;

      try {
        const cachedData = await getMenuBarShortcutsCache(frontmostApp);
        if (!cachedData?.menus?.length) return false;
        // First set the data
        setData(cachedData);

        // Then in the next tick, update loading state to prevent flash
        setTimeout(() => {
          setLoading(false);
          initialLoadRef.current = false;
        }, 0);
        return true;
      } catch {
        // Cache failed, continue to AppleScript loading
      }
      return false;
    },
    [],
  );

  // Applescript loading handler
  const loadFromAppleScript = useCallback(
    async (frontmostApp: Application, signal: AbortSignal) => {
      // Mark that we're now loading from AppleScript
      setLoadingFromAppleScript(true);

      // Get total menu items to handle loading estimates
      const totalItems = await getTotalMenuBarItemsApplescript(frontmostApp);
      if (signal.aborted) return;
      setTotalMenuItems(totalItems);

      // Load menu data from AppleScript
      const menuData = await getMenuBarShortcutsApplescript(
        frontmostApp,
        totalItems,
      );
      if (signal.aborted) return;

      // First set the data
      setData(menuData);

      // Wait to update loading state to prevent empty state flash
      setTimeout(() => {
        setLoading(false);
        setLoadingFromAppleScript(false);
        setTotalMenuItems(0);
        initialLoadRef.current = false;
      }, 0);
    },
    [],
  );

  /*
   * Main loading process for getting menu data
   */
  const loadingHandler = useCallback(
    async (refresh?: "app" | "data") => {
      if (loading && !initialLoadRef.current && !refresh) return;

      const signal = setupLoadingOperation();

      try {
        // get current focused application
        const frontmostApp = await getFrontmostApplication();
        if (!frontmostApp.name)
          throw new Error("Could not detect frontmost application");
        setApp(frontmostApp);

        if (!shouldReloadData(frontmostApp, refresh)) {
          setLoading(false);
          return;
        }

        // Reset total menu items when app changes
        if (frontmostApp?.name !== app?.name) {
          setTotalMenuItems(0);
        }

        if (signal.aborted) return;

        // Try loading from cache first
        const loadedFromCache = await tryLoadFromCache(frontmostApp, refresh);
        if (loadedFromCache || signal.aborted) return;

        // If cache loading failed or was skipped, load from AppleScript
        await loadFromAppleScript(frontmostApp, signal);
      } catch (error) {
        // Only show error if not aborted
        if (signal.aborted) return;
        showHUD(String(error));
        setLoading(false);
        setTotalMenuItems(0);
        setLoadingFromAppleScript(false);
      }
    },
    [
      app,
      loading,
      setupLoadingOperation,
      shouldReloadData,
      tryLoadFromCache,
      loadFromAppleScript,
    ],
  );

  /*
   * Load initial data
   */
  useEffect(() => {
    loadingHandler();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  /*
   * Listen for focused application changes and load new app data
   */
  useEffect(() => {
    if (!app?.name) return;

    const checkFocusedApplication = async () => {
      try {
        const updatedApp = await getFrontmostApplication();
        if (app?.name === updatedApp.name) return;
        await loadingHandler("app");
      } catch (error) {
        console.error("Error checking focused app:", error);
      }
    };

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(checkFocusedApplication, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [app?.name]);

  /*
   * Update loading messages
   */
  useEffect(() => {
    if (!app?.name || !loadingFromAppleScript) {
      // Clear loading message if not loading from AppleScript
      setLoadingMessage(null);
      setLoadingState(null);
      return;
    }

    if (totalMenuItems && totalMenuItems > 0) {
      const estimatedMinutes = Math.ceil(totalMenuItems / 60);
      setLoadingMessage(`Initial loading of ${totalMenuItems} menu items...`);
      setLoadingState(
        `Estimate: ${estimatedMinutes} ${estimatedMinutes === 1 ? "minute" : "minutes"}`,
      );
    }

    return () => {
      setLoadingMessage(null);
      setLoadingState(null);
    };
  }, [app?.name, totalMenuItems, loadingFromAppleScript]);

  // Create a computed "loaded" state that ensures we have data before showing content
  const loaded = Boolean(data?.menus?.length && app?.name && !loading);

  return useMemo(
    () => ({
      loading,
      app,
      data,
      totalMenuItems,
      loadingMessage,
      loadingState,
      loaded,
      refreshMenuItemsData: () => loadingHandler("data"),
    }),
    [
      loading,
      app?.name,
      data,
      totalMenuItems,
      loadingMessage,
      loadingState,
      loaded,
    ],
  );
}
