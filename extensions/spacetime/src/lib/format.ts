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

/** Fixed-width HH:MM:SS used in CSV exports. */
export function formatHMS(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

export function sessionTotalSeconds(session: Session): number {
  return Object.values(session.spaces).reduce((acc, r) => acc + r.seconds, 0);
}

export function sortedSpaces(session: Session): SpaceRecord[] {
  return Object.values(session.spaces).sort((a, b) => b.seconds - a.seconds);
}
