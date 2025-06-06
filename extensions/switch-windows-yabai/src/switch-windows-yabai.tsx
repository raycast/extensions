// TypeScript
import { Action, ActionPanel, List, LocalStorage } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useState, useEffect, useMemo, useCallback } from "react";
import { ENV, YABAI, YabaiWindow, SortMethod } from "./models";
import { handleAggregateToSpace, handleCloseEmptySpaces, handleCloseWindow, handleFocusWindow } from "./handlers";
import { DisplayActions } from "./display-actions-yabai";
import Fuse from "fuse.js";

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

export default function Command() {
  const [usageTimes, setUsageTimes] = useState<Record<string, number>>({});
  const [inputText, setInputText] = useState("");
  const searchText = useDebounce(inputText, 150); // 150ms debounce delay
  const [windows, setWindows] = useState<YabaiWindow[]>([]);
  const [sortMethod, setSortMethod] = useState<SortMethod>(SortMethod.RECENTLY_USED);
  const [isSearching, setIsSearching] = useState(false);

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
          setSortMethod(storedSortMethod as SortMethod);
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
    LocalStorage.setItem("sortMethod", sortMethod);
  }, [sortMethod]);

  // Query windows using useExec.
  const { isLoading, data, error } = useExec<YabaiWindow[]>(YABAI, ["-m", "query", "--windows"], {
    env: ENV,
    parseOutput: ({ stdout }) => {
      if (!stdout) return [];
      try {
        const parsed = JSON.parse(stdout.toString());
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },
    keepPreviousData: false,
  });

  useEffect(() => {
    console.log("Data changed:", data, isLoading, error);
    if (data !== undefined) {
      setWindows(data);
    } else if (!isLoading && !error) {
      setWindows([]);
    }
  }, [data, isLoading, error]);

  // Function to remove a window from the local listing after it's closed.
  const removeWindow = useCallback((id: number) => {
    setWindows((prevWindows) => prevWindows.filter((w) => w.id !== id));
  }, []);

  // Create a Fuse instance for fuzzy searching
  const fuse = useMemo(() => {
    if (!Array.isArray(windows) || windows.length === 0) return null;
    return new Fuse(windows, {
      keys: ["app", "title"],
      includeScore: true,
      threshold: 0.4, // Lower threshold means more strict matching
      ignoreLocation: true, // Search the entire string, not just from the beginning
      useExtendedSearch: true, // Enable extended search for more powerful queries
    });
  }, [windows]);

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
    const results = fuse.search(searchText);
    setIsSearching(false); // Search is complete
    return results.map((result) => result.item);
  }, [windows, searchText, fuse]);

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

  return (
    <List
      isLoading={isLoading || isSearching}
      onSearchTextChange={setInputText}
      searchBarPlaceholder="Search windows..."
      filtering={false} // Disable built-in filtering since we're using Fuse.js
      throttle={false} // Disable throttling for more responsive search
    >
      <List.Section title="Windows" subtitle={sortedWindows.length.toString()}>
        {sortedWindows.map((win) => (
          <List.Item
            key={win.id}
            icon={getAppIcon(win)}
            title={win.app}
            subtitle={win.title}
            actions={
              <WindowActions
                windowId={win.id}
                windowApp={win.app}
                onFocused={(id) =>
                  setUsageTimes((prev) => ({
                    ...prev,
                    [id]: Date.now(),
                  }))
                }
                onRemove={removeWindow}
                sortMethod={sortMethod}
                setSortMethod={setSortMethod}
              />
            }
          />
        ))}
      </List.Section>

      {!isLoading && sortedWindows.length === 0 && (
        <List.EmptyView
          title="No Windows Found"
          description="Yabai reported no windows, or there was an issue fetching them."
        />
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
}: {
  windowId: number;
  windowApp: string;
  onFocused: (id: number) => void;
  onRemove: (id: number) => void;
  sortMethod: SortMethod;
  setSortMethod: (method: SortMethod) => void;
}) {
  return (
    <ActionPanel>
      <Action
        title="Switch to Window"
        onAction={handleFocusWindow(windowId, windowApp, onFocused)}
        shortcut={{ modifiers: [], key: "enter" }}
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
      <DisplayActions />
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

function getAppIcon(window: YabaiWindow) {
  const appName = window.app;

  // Handle special cases for system apps
  if (appName === "Finder") {
    return { fileIcon: "/System/Library/CoreServices/Finder.app" };
  }

  if (appName === "SystemUIServer" || appName === "Control Center") {
    return { source: "gear" };
  }

  // Create a list of possible paths for the app
  const possiblePaths = [
    `/Applications/${appName}.app`,
    `~/Applications/${appName}.app`,
    `/System/Applications/${appName}.app`,
    `/System/Library/CoreServices/${appName}.app`,
  ];

  // Special cases for common apps
  if (appName.toLowerCase().includes("whatsapp")) {
    possiblePaths.unshift("/Applications/WhatsApp.app");
  }

  // Special cases for JetBrains IDEs
  const jetBrainsMap = {
    WebStorm: [
      "/Applications/WebStorm.app",
      "~/Library/Application Support/JetBrains/Toolbox/apps/WebStorm/ch-0/*/WebStorm.app",
    ],
    "IntelliJ IDEA": [
      "/Applications/IntelliJ IDEA.app",
      "/Applications/IntelliJ IDEA CE.app",
      "~/Library/Application Support/JetBrains/Toolbox/apps/IDEA-U/ch-0/*/IntelliJ IDEA.app",
    ],
    PyCharm: [
      "/Applications/PyCharm.app",
      "/Applications/PyCharm CE.app",
      "~/Library/Application Support/JetBrains/Toolbox/apps/PyCharm-P/ch-0/*/PyCharm.app",
    ],
  };

  // Check if it's a JetBrains IDE
  for (const [ideName, paths] of Object.entries(jetBrainsMap)) {
    if (appName === ideName) {
      // Add JetBrains specific paths to the beginning of our search list
      possiblePaths.unshift(...paths);
      break;
    }
  }

  // Try to find a generic icon for the app type
  let genericIcon = { source: "app-generic" };

  // Set more specific generic icons based on app name
  if (appName.toLowerCase().includes("chrome")) {
    genericIcon = { source: "globe" };
  } else if (appName.toLowerCase().includes("terminal") || appName.toLowerCase().includes("iterm")) {
    genericIcon = { source: "terminal" };
  } else if (appName.toLowerCase().includes("safari") || appName.toLowerCase().includes("firefox")) {
    genericIcon = { source: "globe" };
  } else if (appName.toLowerCase().includes("mail") || appName.toLowerCase().includes("outlook")) {
    genericIcon = { source: "envelope" };
  } else if (
    appName.toLowerCase().includes("slack") ||
    appName.toLowerCase().includes("whatsapp") ||
    appName.toLowerCase().includes("messages") ||
    appName.toLowerCase().includes("telegram")
  ) {
    genericIcon = { source: "message" };
  } else if (
    appName.toLowerCase().includes("notes") ||
    appName.toLowerCase().includes("text") ||
    appName.toLowerCase().includes("word") ||
    appName.toLowerCase().includes("pages")
  ) {
    genericIcon = { source: "document" };
  } else if (
    appName.toLowerCase().includes("code") ||
    appName.toLowerCase().includes("studio") ||
    appName.toLowerCase().includes("webstorm") ||
    appName.toLowerCase().includes("intellij") ||
    appName.toLowerCase().includes("pycharm")
  ) {
    genericIcon = { source: "terminal" };
  }

  // Build a chain of fallbacks
  let iconConfig = genericIcon;

  // Go through possible paths in reverse order to build the fallback chain
  for (let i = possiblePaths.length - 1; i >= 0; i--) {
    iconConfig = {
      fileIcon: possiblePaths[i],
      fallback: iconConfig,
    };
  }

  return iconConfig;
}
