import { ScanResult } from "./coordinator";

/** Human-readable elapsed duration. "<1h", "5h", "1 day", "12 days". */
export function formatDuration(ms: number): string {
  const hr = Math.floor(ms / (60 * 60 * 1000));
  if (hr < 1) return "<1h";
  if (hr < 24) return `${hr}h`;
  const days = Math.floor(hr / 24);
  return days === 1 ? "1 day" : `${days} days`;
}

/**
 * Calendar-aware day label for grouping history entries. Returns "Today",
 * "Yesterday", the weekday for anything within the last week, and an absolute
 * date for older entries.
 */
export function dayLabel(epochMs: number): string {
  const date = new Date(epochMs);
  const now = new Date();
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (isSameDay(date, now)) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return "Yesterday";
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diffDays < 7)
    return date.toLocaleDateString(undefined, { weekday: "long" });
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * A compact unicode progress bar, e.g. `███████░░░ 70%`. Raycast's List has no
 * native progress widget, so we render one with block characters. The ratio is
 * clamped to [0, 1]; `total <= 0` yields an empty string (nothing to show).
 */
export function progressBar(done: number, total: number, width = 20): string {
  if (total <= 0) return "";
  const ratio = Math.max(0, Math.min(1, done / total));
  const filled = Math.round(ratio * width);
  const bar = "█".repeat(filled) + "░".repeat(Math.max(0, width - filled));
  return `${bar} ${Math.round(ratio * 100)}%`;
}

/** Short clock display like "4:21 PM". */
export function timeOfDay(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Hostname of a URL, dropping the "www." prefix. Returns "Open" if the URL won't parse. */
export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Open";
  }
}

/**
 * Navigation title that responds to current state — selection wins, then updates,
 * then adoption candidates, then a clean "Up to date".
 */
export function navigationTitle(
  scan: ScanResult | null,
  updatesCount: number,
  adoptableCount: number,
  selectedCount: number,
): string {
  if (!scan) return "Mac Updater";
  if (selectedCount > 0) return `${selectedCount} selected`;
  if (updatesCount > 0)
    return `${updatesCount} update${updatesCount === 1 ? "" : "s"}`;
  if (adoptableCount > 0) return `Up to date · ${adoptableCount} adoptable`;
  return "Up to date";
}
