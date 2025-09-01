import {
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
  Action,
  LocalStorage,
  openExtensionPreferences,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import isEmpty from "lodash.isempty";
import useConfig from "./useConfig";
import { fetcher, showElapsedTime, isInProgress } from "./utils";
import { getTimeEntries } from "./index";
import { TimeEntry } from "./types";

function OpenWebPage() {
  return <Action.OpenInBrowser title="Open Website" url="https://app.clockify.me" />;
}

function useClock(entry: TimeEntry) {
  const [time, setTime] = useState(showElapsedTime(entry));

  useEffect(() => {
    const interval = setInterval(() => setTime(showElapsedTime(entry)), 1000);
    return () => clearInterval(interval);
  }, [entry]);

  return time;
}

function ActiveTimeEntryItem({ entry, updateActiveEntries }: { entry: TimeEntry; updateActiveEntries: () => void }) {
  const time = useClock(entry);

  const handleStopTimer = useCallback(async () => {
    await stopCurrentTimer();
    updateActiveEntries();
  }, [entry.id, updateActiveEntries]);

  const handleCancelTimer = useCallback(async () => {
    const confirmed = await confirmAlert({
      title: "Cancel Time Entry",
      message: "Are you sure you want to cancel this time entry? This action cannot be undone.",
      primaryAction: {
        title: "Yes, Cancel Entry",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await cancelTimeEntry(entry.id);
      updateActiveEntries();
    }
  }, [entry.id, updateActiveEntries]);

  return (
    <List.Item
      id={entry.id}
      title={entry.description || "No Description"}
      subtitle={`${entry.project?.name || "No Project"} ${entry.task?.name ? `• ${entry.task.name}` : ""}`}
      accessories={[
        { text: time, icon: Icon.Clock },
        { text: entry.project?.clientName || "No Client", icon: { source: Icon.Dot, tintColor: entry.project?.color } },
      ]}
      icon={{ source: Icon.Clock, tintColor: entry.project?.color }}
      keywords={[
        ...(entry.description?.split(" ") ?? []),
        ...(entry.project?.name?.split(" ") ?? []),
        ...(entry.task?.name?.split(" ") ?? []),
      ]}
      actions={
        <ActionPanel>
          <Action icon={Icon.Stop} title="Stop Timer" onAction={handleStopTimer} />
          <Action
            icon={Icon.Trash}
            title="Cancel Entry"
            style={Action.Style.Destructive}
            onAction={handleCancelTimer}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
          />
          <OpenWebPage />
        </ActionPanel>
      }
    />
  );
}

export default function ActiveTimeEntries() {
  const { config, isValidToken, setIsValidToken } = useConfig();
  const [activeEntries, setActiveEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const updateActiveEntries = useCallback(async (): Promise<void> => {
    if (isEmpty(config) || !isValidToken) return;

    setIsLoading(true);

    try {
      const entries = await getTimeEntries({ onError: setIsValidToken });
      // Filter for only active/in-progress entries
      const activeEntries = entries.filter(isInProgress);
      setActiveEntries(activeEntries || []);
    } catch (error) {
      console.error("Failed to fetch active entries:", error);
      setActiveEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, [config, isValidToken, setIsValidToken]);

  useEffect(() => {
    updateActiveEntries();
  }, [updateActiveEntries]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search active time entries">
      {!isValidToken ? (
        <List.Item
          icon={Icon.ExclamationMark}
          title="Invalid API Key Detected"
          accessories={[{ text: `Go to Extensions → Clockify` }]}
          actions={
            <ActionPanel>
              <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : activeEntries.length === 0 ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="No Active Time Entries"
          description="You don't have any running timers. Start a timer from the main Clockify command."
          actions={
            <ActionPanel>
              <OpenWebPage />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={`Active Time Entries (${activeEntries.length})`}>
          {activeEntries.map((entry) => (
            <ActiveTimeEntryItem key={entry.id} entry={entry} updateActiveEntries={updateActiveEntries} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

// API Functions
async function stopCurrentTimer(): Promise<void> {
  showToast(Toast.Style.Animated, "Stopping timer…");

  const workspaceId = await LocalStorage.getItem("workspaceId");
  const userId = await LocalStorage.getItem("userId");

  const { data, error } = await fetcher(`/workspaces/${workspaceId}/user/${userId}/time-entries`, {
    method: "PATCH",
    body: { end: new Date().toISOString() },
  });

  if (!error && data) {
    showToast(Toast.Style.Success, "Timer stopped");
  } else {
    showToast(Toast.Style.Failure, "Failed to stop timer");
  }
}

async function cancelTimeEntry(entryId: string): Promise<void> {
  showToast(Toast.Style.Animated, "Canceling time entry…");

  const workspaceId = await LocalStorage.getItem("workspaceId");

  const { error } = await fetcher(`/workspaces/${workspaceId}/time-entries/${entryId}`, {
    method: "DELETE",
  });

  if (!error) {
    showToast(Toast.Style.Success, "Time entry canceled");
  } else {
    showToast(Toast.Style.Failure, "Failed to cancel time entry");
  }
}
