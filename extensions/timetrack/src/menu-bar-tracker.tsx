import { Color, Icon, LaunchType, LocalStorage, MenuBarExtra, launchCommand, showHUD } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "recentTimeEntries";
const STORAGE_KEY_TIMESTAMPS = "recentTimeEntriesTimestamps";
const STORAGE_KEY_ACTIVE = "activeTimeEntry";
const HISTORY_LIMIT = 5;
const REFRESH_MS = 60_000;
const TICK_MS = 60_000;

type TimestampMap = Record<string, string>;

function formatElapsed(trackedAt?: Date, nowMs?: number) {
  if (!trackedAt || !nowMs) return "";
  const diffMs = Math.max(0, nowMs - trackedAt.getTime());
  const totalMinutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatTrackedAt(trackedAt?: Date) {
  if (!trackedAt) return undefined;
  return trackedAt.toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    month: "short",
    day: "2-digit",
  });
}

export default function MenuBarTracker() {
  const [entries, setEntries] = useState<string[]>([]);
  const [timestamps, setTimestamps] = useState<TimestampMap>({});
  const [activeEntry, setActiveEntry] = useState<string | undefined>();
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const [loading, setLoading] = useState(true);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadStorage() {
      const storedEntries = await LocalStorage.getItem<string>(STORAGE_KEY);
      const storedTimestamps = await LocalStorage.getItem<string>(STORAGE_KEY_TIMESTAMPS);
      const storedActive = await LocalStorage.getItem<string>(STORAGE_KEY_ACTIVE);

      if (!isMounted) return;

      try {
        setEntries(storedEntries ? JSON.parse(storedEntries) : []);
      } catch (error) {
        console.error("Failed to parse stored entries", error);
        setEntries([]);
      }

      try {
        const parsedTimestamps = storedTimestamps ? JSON.parse(storedTimestamps) : {};
        setTimestamps(parsedTimestamps);
      } catch (error) {
        console.error("Failed to parse stored timestamps", error);
        setTimestamps({});
      }

      setActiveEntry(storedActive ?? undefined);

      setLoading(false);
    }

    loadStorage();

    const storagePoll = setInterval(loadStorage, REFRESH_MS);
    const tick = setInterval(() => {
      setNowMs(Date.now());
      forceUpdate((n) => n + 1);
    }, TICK_MS);

    return () => {
      isMounted = false;
      clearInterval(storagePoll);
      clearInterval(tick);
    };
  }, []);

  const handleStopTracking = useCallback(
    async (silent?: boolean) => {
      if (!activeEntry) return;

      setActiveEntry(undefined);
      await LocalStorage.removeItem(STORAGE_KEY_ACTIVE);

      if (!silent) {
        await showHUD("Tracking stopped");
      }
    },
    [activeEntry],
  );

  useEffect(() => {
    const latest = entries[0];
    if (!activeEntry && latest) {
      const latestTimestamp = timestamps[latest] ? new Date(timestamps[latest]) : undefined;
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Backfill active tracking for the most recent same-day entry so older installs behave as before
      if (latestTimestamp && latestTimestamp >= todayStart) {
        setActiveEntry(latest);
        LocalStorage.setItem(STORAGE_KEY_ACTIVE, latest).catch((error) => {
          console.error("Failed to backfill active entry", error);
        });
      }
    }
  }, [activeEntry, entries, timestamps]);

  useEffect(() => {
    if (!activeEntry) return;
    const trackedAtIso = timestamps[activeEntry];
    if (!trackedAtIso) return;

    const trackedAt = new Date(trackedAtIso);
    const now = new Date(nowMs);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (trackedAt < todayStart) {
      void handleStopTracking(true);
    }
  }, [activeEntry, timestamps, nowMs, handleStopTracking]);

  const { latestText, latestTrackedAt, recentHistory } = useMemo(() => {
    const current = activeEntry;
    const tracked = current && timestamps[current] ? new Date(timestamps[current]) : undefined;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const history = entries
      .slice(0, HISTORY_LIMIT + 1)
      .map((text) => ({
        text,
        trackedAt: timestamps[text] ? new Date(timestamps[text]) : undefined,
      }))
      .filter((entry) => entry.trackedAt && entry.trackedAt >= todayStart);

    return {
      latestText: current,
      latestTrackedAt: tracked,
      recentHistory: history,
    };
  }, [activeEntry, entries, timestamps]);

  const title =
    latestText && latestTrackedAt
      ? `${latestText.slice(0, 10)} ${formatElapsed(latestTrackedAt, nowMs)}`
      : "No tracking";

  return (
    <MenuBarExtra
      key={nowMs}
      icon="extension-icon.png"
      title={title}
      isLoading={loading}
      tooltip={latestTrackedAt ? `Started ${formatTrackedAt(latestTrackedAt)}` : "No recent entry"}
    >
      {latestText ? (
        <MenuBarExtra.Section title="Current">
          <MenuBarExtra.Item
            title={latestText}
            subtitle={formatElapsed(latestTrackedAt, nowMs)}
            icon={{ source: Icon.Clock, tintColor: Color.Green }}
          />
          <MenuBarExtra.Item
            title="Stop Current Tracking"
            icon={{ source: Icon.Stop, tintColor: Color.Red }}
            onAction={() => handleStopTracking()}
          />
        </MenuBarExtra.Section>
      ) : (
        <MenuBarExtra.Item title="No active tracking" />
      )}

      {recentHistory.length > 1 && (
        <MenuBarExtra.Section title="Last 5">
          {recentHistory.slice(1, HISTORY_LIMIT + 1).map((entry, index) => (
            <MenuBarExtra.Item
              key={`${entry.text}-${index}`}
              title={entry.text}
              subtitle={formatTrackedAt(entry.trackedAt)}
              icon={{ source: Icon.Clock, tintColor: Color.Blue }}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Track Time"
          icon={Icon.AppWindow}
          onAction={() =>
            launchCommand({
              name: "track-time",
              type: LaunchType.UserInitiated,
            })
          }
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
