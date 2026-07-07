// Shared plumbing: Hejour's index.json (read path) and hejour:// deep links
// (write path). The index lives in whichever storage folder the app uses —
// iCloud Drive or local Application Support.

import { existsSync, readFileSync, statSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export interface TodoRef {
  charIndex: number;
  text: string;
}

export interface NoteRecord {
  id: string;
  /** Start of day, unix seconds (local midnight). */
  day: number;
  lines: string[];
  todos: TodoRef[];
  hasContent: boolean;
}

export interface LinkRecord {
  id: string;
  from: number;
  to: number;
  lines: string[];
  todos: TodoRef[];
}

export interface HejourIndex {
  notes: NoteRecord[];
  links: LinkRecord[];
}

const CANDIDATE_PATHS = [
  join(
    homedir(),
    "Library/Mobile Documents/com~apple~CloudDocs/Hejour/index.json",
  ),
  join(homedir(), "Library/Application Support/Hejour/index.json"),
];

/** The active index.json — when both storage modes left one behind, the
 *  most recently written wins. */
export function indexPath(): string | undefined {
  const existing = CANDIDATE_PATHS.filter((path) => existsSync(path));
  if (existing.length === 0) return undefined;
  return existing.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
}

export function loadIndex(): HejourIndex | undefined {
  const path = indexPath();
  if (!path) return undefined;
  try {
    const parsed = JSON.parse(
      readFileSync(path, "utf8"),
    ) as Partial<HejourIndex>;
    return { notes: parsed.notes ?? [], links: parsed.links ?? [] };
  } catch {
    return undefined;
  }
}

/** Unix seconds → "YYYY-MM-DD" in the local timezone (what hejour://day expects). */
export function dayToDateParam(day: number): string {
  const date = new Date(day * 1000);
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function dayDeepLink(day: number): string {
  return `hejour://day?date=${dayToDateParam(day)}`;
}

const LABEL_FORMAT = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

/** "Today" / "Tomorrow" / "Yesterday", otherwise "Tue, Jul 7". */
export function dayLabel(day: number): string {
  const date = new Date(day * 1000);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (date.getTime() - startOfToday.getTime()) / 86_400_000,
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  return LABEL_FORMAT.format(date);
}

export const HEJOUR_WEBSITE = "https://hejour.com";
