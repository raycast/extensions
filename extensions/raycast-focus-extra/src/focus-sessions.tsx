import { Action, ActionPanel, Color, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";

import { runSync } from "./sync";
import { getStoredSessions } from "./storage";
import type { FocusSession, StoredSession } from "./types";

const THROTTLE_MS = 2 * 60 * 1000; // 2 min

/** ISO date string YYYY-MM-DD for a given Date (local date). */
function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse dateKey (YYYY-MM-DD) to Date at noon local. */
function dateKeyToDate(dateKey: string): Date {
  const [y, m, day] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, day, 12, 0, 0, 0);
}

/** Start (00:00:00) and end (23:59:59) of a calendar date (local), as timestamps. */
function getDayRangeForDateKey(dateKey: string): { start: number; end: number } {
  const [y, m, day] = dateKey.split("-").map(Number);
  const start = new Date(y, m - 1, day, 0, 0, 0, 0);
  const end = new Date(y, m - 1, day, 23, 59, 59, 999);
  return { start: start.getTime(), end: end.getTime() };
}

/** Human-readable label for dateKey; "Today" if today. */
function formatDateKeyForDisplay(dateKey: string): string {
  const d = dateKeyToDate(dateKey);
  return toDateKey(d) === toDateKey(new Date())
    ? "Today"
    : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function toFocusSession(s: StoredSession): FocusSession {
  const start = new Date(s.start);
  const end = new Date(start.getTime() + s.duration * 60 * 1000);
  return {
    title: s.goal,
    start,
    end,
    durationMinutes: s.duration,
  };
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDuration(min: number): string {
  if (min < 60) return `${min} minutes`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h} hours ${m} minutes` : `${h} hours`;
}

async function getSessionsForDate(dateKey: string): Promise<FocusSession[]> {
  const all = await getStoredSessions();
  const { start, end } = getDayRangeForDateKey(dateKey);
  return all
    .filter((s) => {
      const t = new Date(s.start).getTime();
      return t >= start && t <= end;
    })
    .map(toFocusSession)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

const SessionItem = ({ s, onDateChange }: { s: FocusSession; onDateChange: (newDate: string) => void }) => {
  const duration = s.durationMinutes != null ? formatDuration(s.durationMinutes) : "—";
  const startTime = formatTime(s.start);

  const handleDateChange = (date: Date | null) => {
    if (date) onDateChange(toDateKey(date));
  };

  return (
    <List.Item
      title={s.title}
      subtitle={duration}
      accessories={[
        {
          tag: { value: startTime, color: Color.Magenta },
        },
      ]}
      actions={
        <ActionPanel>
          <Action.PickDate title="Change Date" type={Action.PickDate.Type.Date} onChange={handleDateChange} />
        </ActionPanel>
      }
    />
  );
};

const EmptyView = ({ dateLabel }: { dateLabel: string }) => {
  return (
    <List.EmptyView
      title={`No sessions for ${dateLabel}`}
      description='Run "Sync Focus Sessions" to import from log, or pick another date.'
    />
  );
};

export default function Command() {
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date())); // default Today

  const { data: sessions, revalidate } = useCachedPromise(getSessionsForDate, [selectedDateKey]);

  // Background sync on mount (SWR): show stale data, sync with toast, then revalidate
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Syncing…",
      });
      const result = await runSync({ throttleMs: THROTTLE_MS });
      if (cancelled) return;
      if (!result.didRun) {
        toast.style = Toast.Style.Success;
        toast.title = "Up to date";
        toast.message = "Skipped (recently synced).";
      } else if ("error" in result) {
        toast.style = Toast.Style.Failure;
        toast.title = "Sync failed";
        toast.message =
          result.error.message.includes("not permitted") || result.error.message.includes("Full Disk Access")
            ? "Check Full Disk Access for Terminal/Raycast"
            : result.error.message;
      } else if (result.added > 0) {
        toast.style = Toast.Style.Success;
        toast.title = "Synced";
        toast.message = `Added ${result.added} session${result.added !== 1 ? "s" : ""}`;
      } else {
        toast.style = Toast.Style.Success;
        toast.title = "Up to date";
        toast.message = "No new sessions.";
      }
      revalidate();
    })();
    return () => {
      cancelled = true;
    };
  }, []); // run background sync once on mount

  const dateLabel = formatDateKeyForDisplay(selectedDateKey);

  return (
    <List isLoading={sessions === undefined} navigationTitle={`Sessions · ${dateLabel}`} filtering>
      {!sessions || sessions.length === 0 ? (
        <EmptyView dateLabel={dateLabel} />
      ) : (
        sessions.map((s) => (
          <SessionItem key={`${s.start.getTime()}-${s.title}`} s={s} onDateChange={setSelectedDateKey} />
        ))
      )}
    </List>
  );
}
