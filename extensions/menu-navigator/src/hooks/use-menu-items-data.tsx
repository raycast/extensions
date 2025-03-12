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
  const messageIndex = useRef(0);

  // Update loading messages when app or totalMenuItems change - only when loading from AppleScript
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
      messageIndex.current = 0;
    };
  }, [app?.name, totalMenuItems, loadingFromAppleScript]);

  /*
   * Manage loading of menu item data
   */
  const loadingHandler = useCallback(
    async (refresh?: boolean) => {
      if (loading && !initialLoadRef.current) return;

      // Cancel any pending operations
      if (abortControllerRef.current) abortControllerRef.current.abort();

      // Create new abort controller for this operation
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      try {
        setLoading(true);
        // Reset loading message state at the start of loading
        setLoadingFromAppleScript(false);
        setLoadingMessage(null);
        setLoadingState(null);

        // get current focused application
        const frontmostApp = await getFrontmostApplication();
        if (!frontmostApp.name)
          throw new Error("Could not detect frontmost application");
        setApp(frontmostApp);

        // only reload if user is hard refreshing
        // or the focused app has changed
        // or the initial load hasn't completed
        if (
          !refresh &&
          frontmostApp?.name === app?.name &&
          !initialLoadRef.current
        ) {
          setLoading(false);
          return;
        }

        // Reset total menu items when app changes
        if (frontmostApp?.name !== app?.name) {
          setTotalMenuItems(0);
        }

        if (signal.aborted) return;

        // Try loading from cache first
        if (!refresh) {
          try {
            const cachedData = await getMenuBarShortcutsCache(frontmostApp);
            if (cachedData?.menus?.length) {
              // First set the data
              setData(cachedData);
              // Then in the next tick, update loading state to prevent flash
              setTimeout(() => {
                if (!signal.aborted) {
                  setLoading(false);
                  initialLoadRef.current = false;
                }
              }, 0);
              return;
            }
          } catch {
            // Cache failed, continue to AppleScript loading
          }
        }

        // Mark that we're now loading from AppleScript
        setLoadingFromAppleScript(true);

        // Get total menu items to handle loading estimates
        const totalItems = await getTotalMenuBarItemsApplescript(frontmostApp);
        setTotalMenuItems(totalItems);

        if (signal.aborted) return;

        // Load menu data from AppleScript
        const menuData = await getMenuBarShortcutsApplescript(
          frontmostApp,
          totalItems,
        );

        // First set the data
        setData(menuData);

        // Wait to update loading state to prevent empty state flash
        setTimeout(() => {
          if (!signal.aborted) {
            setLoading(false);
            setLoadingFromAppleScript(false);
            setTotalMenuItems(0);
            initialLoadRef.current = false;
          }
        }, 0);
      } catch (error) {
        // Only show error if not aborted
        if (signal.aborted) return;
        showHUD(String(error));
        setLoading(false);
        setTotalMenuItems(0);
        setLoadingFromAppleScript(false);
      }
    },
    [app, loading],
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
        await loadingHandler();
      } catch (error) {
        console.error("Error checking focused app:", error);
      }
    };

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(checkFocusedApplication, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [app?.name]);

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
      refreshMenuItemsData: () => loadingHandler(true),
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
