import { homedir } from "os";

const HOME = homedir();

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value >= 10 || exponent === 0 ? Math.round(value) : value.toFixed(1)} ${units[exponent]}`;
}

/** Display form of a path, with the home directory collapsed to `~`. */
export function tildify(path: string): string {
  return path === HOME || path.startsWith(`${HOME}/`) ? `~${path.slice(HOME.length)}` : path;
}

const DAY = 86_400_000;

/** "today", "3 days ago", "5 months ago", "over a year ago". */
export function formatAge(epochMs: number): string {
  if (!epochMs) return "unknown";

  const days = Math.floor((Date.now() - epochMs) / DAY);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;

  // Months are counted in 30-day steps and years in 365, so a value between the
  // two would otherwise round to "over 0 years ago". Below a year, stay in months.
  if (days < 365) {
    const months = Math.min(11, Math.max(1, Math.floor(days / 30)));
    return `${months} month${months === 1 ? "" : "s"} ago`;
  }

  const years = Math.floor(days / 365);
  return years === 1 ? "over a year ago" : `over ${years} years ago`;
}
