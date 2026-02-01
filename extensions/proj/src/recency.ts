const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;

const RECENT_DAYS = 7;
const STALE_DAYS = 90;

export function formatRelativeTime(
  timestamp: number | undefined,
): string | undefined {
  if (timestamp === undefined) return undefined;

  const now = Date.now();
  const diff = now - timestamp;

  if (diff < MINUTE) return "just now";
  if (diff < HOUR) {
    const mins = Math.floor(diff / MINUTE);
    return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  }
  if (diff < DAY) {
    const hours = Math.floor(diff / HOUR);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (diff < WEEK) {
    const days = Math.floor(diff / DAY);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }
  if (diff < MONTH) {
    const weeks = Math.floor(diff / WEEK);
    return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }

  const months = Math.floor(diff / MONTH);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

export function getRecencyIndicator(
  timestamp: number | undefined,
): "blue" | "red" | undefined {
  if (timestamp === undefined) return undefined;

  const now = Date.now();
  const diff = now - timestamp;

  // Opened today
  if (diff < DAY) return "blue";

  // Stale (90+ days)
  if (diff >= STALE_DAYS * DAY) return "red";

  return undefined;
}

export function isRecentProject(timestamp: number | undefined): boolean {
  if (timestamp === undefined) return false;
  return Date.now() - timestamp < RECENT_DAYS * DAY;
}

export function isStaleProject(timestamp: number | undefined): boolean {
  if (timestamp === undefined) return false;
  return Date.now() - timestamp >= STALE_DAYS * DAY;
}

export async function updateLastOpened(projectPath: string): Promise<void> {
  // Dynamic import to avoid circular dependency
  const { getProjectSettings, saveProjectSettings } =
    await import("./settings");
  const settings = getProjectSettings(projectPath);
  saveProjectSettings(projectPath, {
    ...settings,
    lastOpened: Date.now(),
  });
}
