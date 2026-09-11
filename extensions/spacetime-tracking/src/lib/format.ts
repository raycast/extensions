import { getPreferenceValues } from "@raycast/api";
import { Session, SpaceRecord } from "./types";
import { nameForId } from "./spaceNames";

export interface SpaceInfo {
  /** Stable macOS space id (survives reordering). */
  id?: number;
  index: number;
  label: string;
  display: number;
}

/** Stable key for a space: prefer the stable id, then a label, then the index. */
export function spaceKey(info: SpaceInfo): string {
  if (info.id != null) return `id:${info.id}`;
  if (info.label) return info.label;
  return `Space ${info.index}`;
}

/** Human-friendly name for a stored space record (custom name wins). */
export function spaceName(rec: SpaceRecord): string {
  return (
    nameForId(rec.id) ??
    (rec.label || (rec.index > 0 ? `Space ${rec.index}` : rec.id != null ? `Space #${rec.id}` : "Space"))
  );
}

/** Human-friendly name for a live space (custom name wins). */
export function spaceInfoName(info: SpaceInfo): string {
  return (
    nameForId(info.id) ??
    (info.label || (info.index > 0 ? `Space ${info.index}` : info.id != null ? `Space #${info.id}` : "Space"))
  );
}

/** Format seconds as H:MM:SS (or M:SS below an hour). */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(sec)}`;
  return `${m}:${pad(sec)}`;
}

/** Locale date with a zero-padded 24-hour clock, e.g. "7/21/2026 05:12:33". */
export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.toLocaleDateString()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Fixed-width HH:MM:SS used in CSV exports. */
export function formatHMS(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

/**
 * Minimum seconds a space must be shown for, from the `minSpaceMinutes`
 * preference. Returns null when unset/invalid, meaning "show all spaces".
 */
function minSpaceSeconds(): number | null {
  const raw = getPreferenceValues<Preferences>().minSpaceMinutes?.trim();
  if (!raw) return null;
  const minutes = Number(raw);
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  return minutes * 60;
}

/**
 * Total time recorded in a session: always every space, whatever the
 * minimum-time threshold hides from the breakdown. The threshold is a display
 * filter — subtracting short spaces from the total would make the session clock
 * stall (and stay wrong) while the user sits in a space below it.
 */
export function sessionTotalSeconds(session: Session): number {
  return Object.values(session.spaces).reduce((acc, r) => acc + r.seconds, 0);
}

/** Spaces to display, longest first, after applying the minimum-time threshold. */
export function sortedSpaces(session: Session): SpaceRecord[] {
  const threshold = minSpaceSeconds();
  return Object.values(session.spaces)
    .filter((r) => threshold == null || r.seconds >= threshold)
    .sort((a, b) => b.seconds - a.seconds);
}
