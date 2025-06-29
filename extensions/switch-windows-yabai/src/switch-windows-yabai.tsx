// TypeScript
import { Action, ActionPanel, List, LocalStorage, LaunchType, closeMainWindow } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useState, useEffect, useMemo, useCallback } from "react";
import { ENV, YABAI, YabaiWindow, SortMethod, Application } from "./models";
import { handleAggregateToSpace, handleCloseEmptySpaces, handleCloseWindow, handleFocusWindow } from "./handlers";
import { DisplayActions, MoveWindowToDisplayActions } from "./display-actions-yabai";
import Fuse from "fuse.js";
import { existsSync, readdirSync } from "node:fs";
import * as path from "node:path";
import { exec } from "node:child_process";

// Function to list applications from standard directories
function listApplications(): Application[] {
  const applications: Application[] = [];
  const appDirectories = [
    "/Applications",
    path.join(ENV.HOME, "Applications"),
    "/System/Applications",
    "/System/Library/CoreServices",
  ];

  for (const dir of appDirectories) {
    if (existsSync(dir)) {
      try {
        const files = readdirSync(dir);
        for (const file of files) {
          if (file.endsWith(".app")) {
            const appPath = path.join(dir, file);
            const appName = file.replace(".app", "");
            applications.push({ name: appName, path: appPath });
          }
        }
      } catch (error) {
        console.error(`Error reading directory ${dir}:`, error);
      }
    }
  }

  return applications;
}

// Custom hook for debounced search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set debouncedValue to value after the specified delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cancel the timeout if value changes or component unmounts
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function Command(props: { launchContext?: { launchType: LaunchType } }) {
  const [usageTimes, setUsageTimes] = useState<Record<string, number>>({});
  const [inputText, setInputText] = useState("");
  const searchText = useDebounce(inputText, 30); // Reduced debounce delay for better responsiveness
  const [windows, setWindows] = useState<YabaiWindow[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [sortMethod, setSortMethod] = useState<SortMethod>(SortMethod.RECENTLY_USED);
  const [isSearching, setIsSearching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);

  // Function to remove a window from the local listing after it's closed.
  const removeWindow = useCallback((id: number) => {
    setWindows((prevWindows) => prevWindows.filter((w) => w.id !== id));
  }, []);

  // Function to refresh applications data
  const refreshApplications = useCallback(async () => {
    try {
      const freshApps = listApplications();
      setApplications(freshApps);

      // Update the cache
      await LocalStorage.setItem("cachedApplications", JSON.stringify(freshApps));
      console.log("Updated applications cache");
    } catch (error) {
      console.error("Error refreshing applications:", error);
    }
  }, []);

  // Function to refresh windows data
  const refreshWindows = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const { stdout } = await exec(`${YABAI} -m query --windows`, { env: ENV });
      if (stdout) {
        // Ensure stdout is a string before parsing
        const stdoutStr = typeof stdout === "string" ? stdout : JSON.stringify(stdout);
        try {
          const parsed = JSON.parse(stdoutStr);
          const windowsData = Array.isArray(parsed) ? parsed : [];
          setWindows(windowsData);

          // Update cache with timestamp
          const cacheData = {
            windows: windowsData,
            timestamp: Date.now(),
          };
          await LocalStorage.setItem("cachedWindows", JSON.stringify(cacheData));
          setLastRefreshTime(Date.now());
          console.log("Updated windows cache");
        } catch (parseError) {
          console.error("Error parsing windows data:", parseError, "Raw data:", stdoutStr);
        }
      }
    } catch (error) {
      console.error("Error refreshing windows:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Function to refresh all data
  const refreshAllData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refreshWindows(), refreshApplications()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshWindows, refreshApplications]);

  // Load previous usage times and sort method from local storage when the component mounts.
  useEffect(() => {
    (async () => {
      const storedTimes = await LocalStorage.getItem<string>("usageTimes");
      if (storedTimes) {
        try {
          setUsageTimes(JSON.parse(storedTimes));
        } catch {
          setUsageTimes({});
        }
      }

      const storedSortMethod = await LocalStorage.getItem<string>("sortMethod");
      if (storedSortMethod) {
        try {
          const parsedSortMethod = JSON.parse(storedSortMethod);
          setSortMethod(parsedSortMethod as SortMethod);
        } catch {
          setSortMethod(SortMethod.USAGE);
        }
      }
    })();
  }, []);

  // Persist usage times in local storage when they change.
  useEffect(() => {
    LocalStorage.setItem("usageTimes", JSON.stringify(usageTimes));
  }, [usageTimes]);

  // Persist sort method in local storage when it changes.
  useEffect(() => {
    LocalStorage.setItem("sortMethod", JSON.stringify(sortMethod));
  }, [sortMethod]);

  // Query windows using useExec.
  const { isLoading, data, error } = useExec<YabaiWindow[]>(YABAI, ["-m", "query", "--windows"], {
    env: ENV,
    parseOutput: ({ stdout }) => {
      if (!stdout) return [];
      try {
        // Ensure stdout is a string before parsing
        const stdoutStr = typeof stdout === "string" ? stdout : JSON.stringify(stdout);
        const parsed = JSON.parse(stdoutStr);
        return Array.isArray(parsed) ? parsed : [];
      } catch (parseError) {
        console.error("Error parsing windows data in useExec:", parseError);
        return [];
      }
    },
    keepPreviousData: false,
  });

  // Load cached windows and handle data changes
  useEffect(() => {
    // Load cached windows on mount
    const loadCachedWindows = async () => {
      const cachedData = await LocalStorage.getItem<string>("cachedWindows");
      if (cachedData) {
        try {
          const { windows: cachedWindows, timestamp } = JSON.parse(cachedData);
          if (Array.isArray(cachedWindows) && cachedWindows.length > 0) {
            setWindows(cachedWindows);
            setLastRefreshTime(timestamp);
            console.log("Loaded windows from cache, timestamp:", new Date(timestamp).toLocaleString());
          }
        } catch (error) {
          console.error("Error parsing cached windows:", error);
        }
      }
    };

    loadCachedWindows();

    // Handle data changes from useExec
    if (data !== undefined) {
      setWindows(data);

      // Update cache with timestamp
      const cacheData = {
        windows: data,
        timestamp: Date.now(),
      };
      LocalStorage.setItem("cachedWindows", JSON.stringify(cacheData));
      setLastRefreshTime(Date.now());
      console.log("Updated windows cache from useExec");
    } else if (!isLoading && !error && !data) {
      setWindows([]);
    }
  }, [data, isLoading, error]);

  // Handle background refresh and launch type
  useEffect(() => {
    // Check if we need to refresh based on launch type
    if (props.launchContext?.launchType === LaunchType.UserInitiated) {
      // User explicitly launched the extension, refresh data
      console.log("User initiated launch, refreshing data");
      refreshAllData();
    }

    // Check if data is stale (older than 5 minutes)
    const isDataStale = Date.now() - lastRefreshTime > 5 * 60 * 1000;
    if (isDataStale && lastRefreshTime > 0) {
      console.log("Data is stale, refreshing");
      refreshAllData();
    }

    // Set up periodic refresh (every 5 minutes)
    const refreshInterval = setInterval(
      () => {
        console.log("Periodic refresh");
        refreshAllData();
      },
      5 * 60 * 1000,
    );

    return () => {
      clearInterval(refreshInterval);
    };
  }, [props.launchContext, lastRefreshTime, refreshAllData]);

  // Load applications when the component mounts
  useEffect(() => {
    const loadApplications = async () => {
      // Try to load from cache first
      const cachedApps = await LocalStorage.getItem<string>("cachedApplications");
      if (cachedApps) {
        try {
          const parsedApps = JSON.parse(cachedApps);
          setApplications(parsedApps);
          console.log("Loaded applications from cache");
        } catch (error) {
          console.error("Error parsing cached applications:", error);
        }
      }

      // Then refresh the applications list
      await refreshApplications();
    };

    loadApplications();
  }, [refreshApplications]);

  // Create a Fuse instance for fuzzy searching windows
  const fuse = useMemo(() => {
    if (!Array.isArray(windows) || windows.length === 0) return null;
    return new Fuse(windows, {
      keys: [
        { name: "title", weight: 2 }, // Give title higher weight
        { name: "app", weight: 1 },
      ],
      includeScore: true,
      threshold: 0.4, // Lower threshold for stricter matching
      ignoreLocation: true, // Search the entire string, not just from the beginning
      useExtendedSearch: true, // Enable extended search for more powerful queries
      sortFn: (a, b) => {
        // Custom sort function to prioritize exact matches
        if (a.score === b.score) {
          // If scores are equal, prioritize shorter matches (more precise)
          return a.item.title.toString().length - b.item.title.toString().length;
        }
        return a.score - b.score; // Lower score is better
      },
    });
  }, [windows]);

  // Create a Fuse instance for fuzzy searching applications
  const appFuse = useMemo(() => {
    if (!Array.isArray(applications) || applications.length === 0) return null;
    return new Fuse(applications, {
      keys: ["name"],
      includeScore: true,
      threshold: 0.3, // Even stricter threshold for applications
      ignoreLocation: true,
      useExtendedSearch: true,
      sortFn: (a, b) => {
        // Custom sort function to prioritize exact matches
        if (a.score === b.score) {
          // If scores are equal, prioritize shorter names (more precise)
          return a.item.name.toString().length - b.item.name.toString().length;
        }
        return a.score - b.score; // Lower score is better
      },
    });
  }, [applications]);

  // Set searching state when input text changes
  useEffect(() => {
    if (inputText.trim() && inputText !== searchText) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
  }, [inputText, searchText]);

  // Filter windows based on the search text using fuzzy search
  const filteredWindows = useMemo(() => {
    if (!Array.isArray(windows)) return [];
    if (!searchText.trim()) return windows; // Return all windows if search text is empty

    if (!fuse) return [];

    // Use Fuse.js for fuzzy searching
    try {
      // First try exact match on app name or title
      const exactMatches = windows.filter(
        (win) =>
          win.app.toLowerCase().includes(searchText.toLowerCase()) ||
          win.title.toLowerCase().includes(searchText.toLowerCase()),
      );

      // If we have exact matches, prioritize them
      if (exactMatches.length > 0) {
        setIsSearching(false);
        return exactMatches;
      }

      // Otherwise use fuzzy search
      const results = fuse.search(searchText);
      setIsSearching(false); // Search is complete
      return results.map((result) => result.item);
    } catch (error) {
      console.error("Error during search:", error);
      setIsSearching(false);
      return windows; // Fallback to all windows on error
    }
  }, [windows, searchText, fuse]);

  // Filter applications based on the search text using fuzzy search
  const filteredApplications = useMemo(() => {
    if (!Array.isArray(applications)) return [];
    if (!searchText.trim()) return applications; // Return all applications if search text is empty

    if (!appFuse) return [];

    // Use fuzzy search with optimizations
    try {
      // First try exact match on app name
      const exactMatches = applications.filter((app) => app.name.toLowerCase().includes(searchText.toLowerCase()));

      // If we have exact matches, prioritize them
      if (exactMatches.length > 0) {
        setIsSearching(false);
        return exactMatches;
      }

      // Otherwise use fuzzy search
      const results = appFuse.search(searchText);
      setIsSearching(false); // Search is complete
      return results.map((result) => result.item);
    } catch (error) {
      console.error("Error during application search:", error);
      setIsSearching(false);
      return applications; // Fallback to all applications on error
    }
  }, [applications, searchText, appFuse]);

  // Sort windows based on selected sort method.
  const sortedWindows = useMemo(() => {
    const windows = [...filteredWindows];

    if (sortMethod === SortMethod.USAGE) {
      // Sort by usage (clicks)
      return windows.sort((a, b) => {
        const timeA = usageTimes[a.id] || 0;
        const timeB = usageTimes[b.id] || 0;
        return timeB - timeA;
      });
    } else if (sortMethod === SortMethod.RECENTLY_USED) {
      // Sort by recently used
      // Get the two most recently used windows (by timestamp)
      const recentlyUsedIds = Object.entries(usageTimes)
        .sort(([, timeA], [, timeB]) => timeB - timeA)
        .slice(0, 2)
        .map(([id]) => parseInt(id));

      // Find the corresponding windows
      const previousWindow = windows.find((w) => w.id === recentlyUsedIds[0]);
      const currentWindow = windows.find((w) => w.id === recentlyUsedIds[1]);

      return windows.sort((a, b) => {
        // Previous window (most recently used) comes first
        if (previousWindow && a.id === previousWindow.id) return -1;
        if (previousWindow && b.id === previousWindow.id) return 1;

        // Current window (second most recently used) comes second
        if (currentWindow && a.id === currentWindow.id) return -1;
        if (currentWindow && b.id === currentWindow.id) return 1;

        // Rest in alphabetical order
        return a.app.localeCompare(b.app);
      });
    }

    // Default fallback to usage sort
    return windows.sort((a, b) => {
      const timeA = usageTimes[a.id] || 0;
      const timeB = usageTimes[b.id] || 0;
      return timeB - timeA;
    });
  }, [filteredWindows, usageTimes, sortMethod]);

  // Always select the first window in the list
  const firstWindow = useMemo(() => {
    return sortedWindows.length > 0 ? sortedWindows[0] : undefined;
  }, [sortedWindows]);

  return (
    <List
      isLoading={isLoading || isSearching || isRefreshing}
      onSearchTextChange={setInputText}
      searchBarPlaceholder="Search windows and applications..."
      filtering={false} // Disable built-in filtering since we're using Fuse.js
      throttle={false} // Disable throttling for more responsive search
      selectedItemId={firstWindow ? `window-${firstWindow.id}` : undefined} // Select first window by default
      actions={
        <ActionPanel>
          <Action
            title={isRefreshing ? "Refreshing…" : "Refresh Windows & Apps"}
            onAction={refreshAllData}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            icon={{ source: "arrow.clockwise" }}
          />
        </ActionPanel>
      }
    >
      {sortedWindows.length > 0 && (
        <List.Section title="Windows" subtitle={sortedWindows.length.toString()}>
          {sortedWindows.map((win) => (
            <List.Item
              key={win.id}
              id={`window-${win.id}`} // Add id for default selection
              icon={getAppIcon(win, applications)}
              title={win.app}
              subtitle={win.title}
              accessories={win.focused ? [{ text: "focused" }] : []}
              actions={
                <WindowActions
                  windowId={win.id}
                  windowApp={win.app}
                  isFocused={win.focused}
                  onFocused={(id) => {
                    setUsageTimes((prev) => ({
                      ...prev,
                      [id]: Date.now(),
                    }));
                    closeMainWindow();
                  }}
                  onRemove={removeWindow}
                  sortMethod={sortMethod}
                  setSortMethod={setSortMethod}
                  onRefresh={refreshAllData}
                  isRefreshing={isRefreshing}
                />
              }
            />
          ))}
        </List.Section>
      )}

      {filteredApplications.length > 0 && (
        <List.Section title="Applications" subtitle={filteredApplications.length.toString()}>
          {filteredApplications.map((app) => (
            <List.Item
              key={app.path}
              icon={{ fileIcon: app.path }}
              title={app.name}
              actions={
                <ActionPanel>
                  <Action
                    title="Open Application"
                    onAction={() => {
                      exec(`open "${app.path}"`);
                    }}
                    shortcut={{ modifiers: [], key: "enter" }}
                  />
                  <Action
                    title={isRefreshing ? "Refreshing…" : "Refresh Windows & Apps"}
                    onAction={refreshAllData}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    icon={{ source: "arrow.clockwise" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {!isLoading && sortedWindows.length === 0 && filteredApplications.length === 0 && (
        <List.EmptyView title="No Windows or Applications Found" description="No windows or applications were found." />
      )}

      {error && (
        <List.EmptyView
          title="Error Fetching Windows"
          description={error.message}
          icon={{ source: "@raycast/api/exclamation-mark-triangle-fill" }}
        />
      )}
    </List>
  );
}

function WindowActions({
  windowId,
  windowApp,
  onFocused,
  onRemove,
  sortMethod,
  setSortMethod,
  onRefresh,
  isRefreshing,
  isFocused,
}: {
  windowId: number;
  windowApp: string;
  onFocused: (id: number) => void;
  onRemove: (id: number) => void;
  sortMethod: SortMethod;
  setSortMethod: (method: SortMethod) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  isFocused?: boolean;
}) {
  return (
    <ActionPanel>
      <Action
        title="Switch to Window"
        onAction={isFocused ? () => onFocused(windowId) : handleFocusWindow(windowId, windowApp, onFocused)}
      />
      <Action
        title="Aggregate to Space"
        onAction={handleAggregateToSpace(windowId, windowApp)}
        shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
      />
      <Action
        title="Close Window"
        onAction={handleCloseWindow(windowId, windowApp, onRemove)}
        shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
      />
      <Action
        title="Close Empty Spaces"
        onAction={handleCloseEmptySpaces(windowId, onRemove)}
        shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
      />
      <Action
        title={isRefreshing ? "Refreshing…" : "Refresh Windows & Apps"}
        onAction={onRefresh}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        icon={{ source: "arrow.clockwise" }}
      />
      <ActionPanel.Section title="Display Actions">
        <DisplayActions />
        <MoveWindowToDisplayActions windowId={windowId} windowApp={windowApp} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Sorting">
        <Action
          title="Sort by Usage"
          onAction={() => setSortMethod(SortMethod.USAGE)}
          shortcut={{ modifiers: ["cmd"], key: "1" }}
          icon={sortMethod === SortMethod.USAGE ? { source: "checkmark" } : null}
        />
        <Action
          title="Sort by Previous"
          onAction={() => setSortMethod(SortMethod.RECENTLY_USED)}
          shortcut={{ modifiers: ["cmd"], key: "2" }}
          icon={sortMethod === SortMethod.RECENTLY_USED ? { source: "checkmark" } : null}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function getAppIcon(window: YabaiWindow, applications: Application[]) {
  const appName = window.app;

  // 1. Try to find the application in the pre-loaded applications list
  const foundApp = applications.find((app) => app.name === appName);
  if (foundApp) {
    return { fileIcon: foundApp.path };
  }

  // 2. Handle special cases for system apps with known paths or built-in icons
  if (appName === "Finder") {
    return { fileIcon: "/System/Library/CoreServices/Finder.app" };
  }
  if (appName === "SystemUIServer" || appName === "Control Center") {
    return { source: "gear" }; // Raycast built-in icon
  }

  // 3. Handle common apps with specific Raycast built-in icons
  if (appName.toLowerCase().includes("chrome")) {
    return { source: "globe" };
  }
  if (appName.toLowerCase().includes("terminal") || appName.toLowerCase().includes("iterm")) {
    return { source: "terminal" };
  }
  if (appName.toLowerCase().includes("safari") || appName.toLowerCase().includes("firefox")) {
    return { source: "globe" };
  }
  if (appName.toLowerCase().includes("mail") || appName.toLowerCase().includes("outlook")) {
    return { source: "envelope" };
  }
  if (
    appName.toLowerCase().includes("slack") ||
    appName.toLowerCase().includes("whatsapp") ||
    appName.toLowerCase().includes("messages") ||
    appName.toLowerCase().includes("telegram")
  ) {
    return { source: "message" };
  }
  if (
    appName.toLowerCase().includes("notes") ||
    appName.toLowerCase().includes("text") ||
    appName.toLowerCase().includes("word") ||
    appName.toLowerCase().includes("pages")
  ) {
    return { source: "document" };
  }
  if (
    appName.toLowerCase().includes("code") ||
    appName.toLowerCase().includes("studio") ||
    appName.toLowerCase().includes("webstorm") ||
    appName.toLowerCase().includes("intellij") ||
    appName.toLowerCase().includes("pycharm")
  ) {
    return { source: "terminal" }; // Using terminal for IDEs, could be 'code' if available
  }

  // 4. Fallback to a generic application icon
  return { source: "app-generic" };
}
