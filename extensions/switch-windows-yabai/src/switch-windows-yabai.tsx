// TypeScript
import { Action, ActionPanel, List, LocalStorage } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useState, useEffect, useMemo, useCallback } from "react";
import { ENV, YABAI, YabaiWindow } from "./models";
import { handleAggregateToSpace, handleCloseEmptySpaces, handleCloseWindow, handleFocusWindow } from "./handlers";
import { DisplayActions } from "./display-actions-yabai";

export default function Command() {
  const [usageTimes, setUsageTimes] = useState<Record<string, number>>({});
  const [searchText, setSearchText] = useState("");
  const [windows, setWindows] = useState<YabaiWindow[]>([]);

  // Load previous usage times from local storage when the component mounts.
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
    })();
  }, []);

  // Persist usage times in local storage when they change.
  useEffect(() => {
    LocalStorage.setItem("usageTimes", JSON.stringify(usageTimes));
  }, [usageTimes]);

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

  // Filter windows based on the search text.
  const filteredWindows = useMemo(() => {
    if (!Array.isArray(windows)) return [];
    const lowerQuery = searchText.toLowerCase();
    return windows.filter(
      (win) => win.title.toLowerCase().includes(lowerQuery) || win.app.toLowerCase().includes(lowerQuery),
    );
  }, [windows, searchText]);

  // Sort windows based on usage times.
  const sortedWindows = useMemo(() => {
    return [...filteredWindows].sort((a, b) => {
      const timeA = usageTimes[a.id] || 0;
      const timeB = usageTimes[b.id] || 0;
      return timeB - timeA;
    });
  }, [filteredWindows, usageTimes]);

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search windows..." throttle>
      <List.Section title="Windows" subtitle={sortedWindows.length.toString()}>
        {sortedWindows.map((win) => (
          <List.Item
            key={win.id}
            icon={getAppIcon(win.app)}
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
}: {
  windowId: number;
  windowApp: string;
  onFocused: (id: number) => void;
  onRemove: (id: number) => void;
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
    </ActionPanel>
  );
}

function getAppIcon(appName: string) {
  return { fileIcon: `/Applications/${appName}.app` };
}
