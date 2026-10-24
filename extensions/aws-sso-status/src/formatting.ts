import { ProfileStatus, Settings } from "./aws/types";
export function formatRemainingTime(expiration?: string, now = Date.now()): string {
  const difference = expiration ? Date.parse(expiration) - now : NaN;
  if (!Number.isFinite(difference)) return "Unknown";
  if (difference <= 0) return "Expired";
  const minutes = Math.floor(difference / 60000);
  if (minutes < 1) return "< 1m";
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
/** A cross means credentials are not confirmed usable, including unknown/error states. */
export function menuBarTitle(
  item: ProfileStatus | undefined,
  settings: Settings,
  loading: boolean,
  now = Date.now(),
): string {
  if ((loading && !item) || item?.status === "Checking") return "…";
  const usable =
    item &&
    ["Signed In", "Expiring Soon"].includes(item.status) &&
    !!item.expiration &&
    Date.parse(item.expiration) > now;
  if (settings.menuBarStyle === "remaining" && usable) return formatRemainingTime(item.expiration, now);
  return usable && !item?.stale ? "✓" : "✕";
}
export function displayDate(date?: string): string {
  return date
    ? new Date(date).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not available";
}
