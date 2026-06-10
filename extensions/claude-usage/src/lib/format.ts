import { Color, Icon } from "@raycast/api";
import type { UsageWindow } from "./types";

/**
 * Severity tints with explicit light/dark variants. The dark values are
 * brighter (Apple system-color vibrancy) so the tinted icons stay readable
 * on the dark native menu-bar dropdown, where Raycast's automatic contrast
 * adjustment for named colors doesn't fully apply. `adjustContrast` lets
 * Raycast nudge them further against the background when needed.
 */
const SEVERITY: Record<"red" | "orange" | "yellow" | "green", Color.Dynamic> = {
  red: { light: "#E0203A", dark: "#FF453A", adjustContrast: true },
  orange: { light: "#E0700A", dark: "#FF9F0A", adjustContrast: true },
  yellow: { light: "#C28A00", dark: "#FFD60A", adjustContrast: true },
  green: { light: "#1EA54A", dark: "#32D74B", adjustContrast: true },
};

export function severityColor(pct: number): Color.ColorLike {
  if (pct >= 90) return SEVERITY.red;
  if (pct >= 75) return SEVERITY.orange;
  if (pct >= 50) return SEVERITY.yellow;
  return SEVERITY.green;
}

export function severityIcon(pct: number): Icon {
  if (pct >= 90) return Icon.ExclamationMark;
  if (pct >= 75) return Icon.CircleProgress75;
  if (pct >= 50) return Icon.CircleProgress50;
  if (pct >= 25) return Icon.CircleProgress25;
  return Icon.Circle;
}

export function pct(n: number): string {
  return `${Math.round(n)}%`;
}

/** "2h 13m" style countdown; null when in the past/unknown */
export function countdown(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return null;
  const totalMin = Math.round(ms / 60_000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function localTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const sameDay = date.toDateString() === new Date().toDateString();
  const time = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (sameDay) return time;
  return `${date.toLocaleDateString(undefined, { weekday: "short" })} ${time}`;
}

/** Unicode progress bar for markdown / menu items, e.g. ████████░░░░ */
export function bar(pctValue: number, width = 20): string {
  const filled = Math.round(
    (Math.max(0, Math.min(100, pctValue)) / 100) * width,
  );
  return "█".repeat(filled) + "░".repeat(width - filled);
}

export function windowSubtitle(w: UsageWindow): string {
  const cd = countdown(w.resetsAt);
  const at = localTime(w.resetsAt);
  if (cd && at) return `resets in ${cd} (${at})`;
  if (cd) return `resets in ${cd}`;
  return "no active window";
}
