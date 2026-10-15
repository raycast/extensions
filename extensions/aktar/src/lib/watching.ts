import { Color } from "@raycast/api";
import type { WatchedFolders, WatchedFolderStatus } from "../api/types";

export const WATCHED_FOLDERS_SETTINGS_URL = "aktar://watch";
export const UPDATE_FOR_WATCHED_FOLDERS = "Update Aktar to use watched folders";

export const STATUS_TAGS: Record<WatchedFolderStatus, { title: string; color: Color }> = {
  watching: { title: "Watching", color: Color.Green },
  paused: { title: "Paused", color: Color.Yellow },
  disabled: { title: "Disabled", color: Color.SecondaryText },
  accessNeeded: { title: "Access Needed", color: Color.Orange },
  notFound: { title: "Folder Not Found", color: Color.Red },
  error: { title: "Error", color: Color.Red },
};

/** Minutes from `now` until the next local midnight, at least 1. */
export function minutesUntilTomorrow(now = new Date()) {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return Math.max(1, Math.ceil((midnight.getTime() - now.getTime()) / 60_000));
}

/** "Watching 2 folders", "Paused until 14:00", "Paused until Oct 3, 09:00", or "Paused". */
export function describeWatching(state: Pick<WatchedFolders, "paused" | "pausedUntil">, folderCount: number) {
  if (!state.paused) return `Watching ${folderCount} ${folderCount === 1 ? "folder" : "folders"}`;
  const until = state.pausedUntil ? new Date(state.pausedUntil) : undefined;
  if (!until || Number.isNaN(until.getTime())) return "Paused";
  const time = until.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const isToday = until.toDateString() === new Date().toDateString();
  if (isToday) return `Paused until ${time}`;
  return `Paused until ${until.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${time}`;
}
