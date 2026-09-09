import {
  Action,
  ActionPanel,
  showToast,
  Toast,
  showHUD,
  Icon,
  Color,
  getPreferenceValues,
  List,
  LocalStorage,
} from "@raycast/api";
import { useState, useMemo, useEffect, useRef } from "react";

const STORAGE_KEY = "recentTimeEntries";
const STORAGE_KEY_TIMESTAMPS = "recentTimeEntriesTimestamps";
const STORAGE_KEY_ACTIVE = "activeTimeEntry";
const MAX_RECENT_ENTRIES = 10;

interface Preferences {
  userId: string;
  apiKey: string;
  apiUrl: string;
}

interface TimeEntry {
  id: string;
  text: string;
  trackedAt?: Date;
}

export default function TrackTime() {
  const [searchText, setSearchText] = useState("");
  const searchTextRef = useRef("");
  const [isLoading, setIsLoading] = useState(false);
  const [recentEntries, setRecentEntries] = useState<string[]>([]);
  const [recentTimestamps, setRecentTimestamps] = useState<Record<string, string>>({});
  const [storageLoading, setStorageLoading] = useState(true);

  // Load storage data asynchronously after initial render
  useEffect(() => {
    async function loadStorage() {
      try {
        const entriesData = await LocalStorage.getItem<string>(STORAGE_KEY);
        const timestampsData = await LocalStorage.getItem<string>(STORAGE_KEY_TIMESTAMPS);

        if (entriesData) {
          setRecentEntries(JSON.parse(entriesData));
        }
        if (timestampsData) {
          setRecentTimestamps(JSON.parse(timestampsData));
        }
      } finally {
        setStorageLoading(false);
      }
    }

    loadStorage();
  }, []);

  const handleSearchTextChange = (text: string) => {
    searchTextRef.current = text;
    setSearchText(text);
  };

  async function handleSubmit(message: string) {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Message is required",
      });
      return;
    }

    setIsLoading(true);

    try {
      const preferences = getPreferenceValues<Preferences>();
      const payload = {
        userId: preferences.userId,
        timeTrackingText: trimmedMessage,
      };

      const response = await fetch(preferences.apiUrl, {
        method: "POST",
        headers: {
          "X-Apikey": preferences.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`API error (${response.status}): ${errorText || response.statusText}`);
      }

      // Save to recent entries with timestamp
      const updated = [trimmedMessage, ...recentEntries.filter((e) => e !== trimmedMessage)].slice(
        0,
        MAX_RECENT_ENTRIES,
      );
      // Clean up timestamps - only keep timestamps for entries that still exist
      const updatedTimestamps = Object.fromEntries(
        Object.entries({ ...recentTimestamps, [trimmedMessage]: new Date().toISOString() }).filter(([key]) =>
          updated.includes(key),
        ),
      );

      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      await LocalStorage.setItem(STORAGE_KEY_TIMESTAMPS, JSON.stringify(updatedTimestamps));
      await LocalStorage.setItem(STORAGE_KEY_ACTIVE, trimmedMessage);
      setRecentEntries(updated);
      setRecentTimestamps(updatedTimestamps);

      await showHUD(`✓ Time tracked: ${trimmedMessage}`);
      setSearchText("");
      searchTextRef.current = ""; // Clear ref to prevent accidental resubmission
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to track time",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const entries: TimeEntry[] = useMemo(
    () =>
      recentEntries.map((text, index) => ({
        id: `${index}`,
        text,
        trackedAt: recentTimestamps[text] ? new Date(recentTimestamps[text]) : undefined,
      })),
    [recentEntries, recentTimestamps],
  );

  const { todayEntries, olderEntries } = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const today: TimeEntry[] = [];
    const older: TimeEntry[] = [];

    entries.forEach((entry) => {
      // Only show entries with valid timestamps
      if (!entry.trackedAt) return;

      if (entry.trackedAt >= todayStart) {
        today.push(entry);
      } else {
        older.push(entry);
      }
    });

    return { todayEntries: today, olderEntries: older };
  }, [entries]);

  // Helper to render a time entry
  const renderEntry = (entry: TimeEntry, showDate: boolean) => {
    const timeText = entry.trackedAt
      ? showDate
        ? `${entry.trackedAt.toLocaleDateString("en-GB")} - ${entry.trackedAt.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}`
        : entry.trackedAt.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
      : "";

    return (
      <List.Item
        key={entry.id}
        title={entry.text}
        icon={{ source: Icon.Clock, tintColor: Color.Blue }}
        accessories={[
          {
            text: timeText,
            tooltip: entry.trackedAt ? `Tracked at ${entry.trackedAt.toLocaleString()}` : undefined,
          },
        ]}
        actions={
          <ActionPanel>
            <Action
              title="Track This Entry Again"
              icon={{ source: Icon.Clock, tintColor: Color.Green }}
              onAction={() => handleSubmit(entry.text)}
            />
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Type your time tracking message..."
      onSearchTextChange={handleSearchTextChange}
      selectedItemId={searchText.length > 0 ? "new-entry" : "placeholder"}
      throttle
    >
      {searchText.length > 0 ? (
        <List.Section title="New Entry">
          <List.Item
            id="new-entry"
            title={searchText}
            icon={{ source: Icon.Clock, tintColor: Color.Green }}
            accessories={[{ text: "⏎ to Track" }]}
            actions={
              <ActionPanel>
                <Action
                  title="Track Time Entry"
                  icon={{ source: Icon.Clock, tintColor: Color.Green }}
                  onAction={() => handleSubmit(searchTextRef.current)}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : (
        <>
          <List.Item
            id="placeholder"
            title=""
            accessories={[{ text: "Start typing to track time..." }]}
            actions={<ActionPanel />}
          />
          {!storageLoading && todayEntries.length > 0 && (
            <List.Section title="Today">{todayEntries.map((entry) => renderEntry(entry, false))}</List.Section>
          )}
          {!storageLoading && olderEntries.length > 0 && (
            <List.Section title="Earlier">{olderEntries.map((entry) => renderEntry(entry, true))}</List.Section>
          )}
        </>
      )}
    </List>
  );
}
