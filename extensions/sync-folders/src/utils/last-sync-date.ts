/**
 * Returns a formatted string representing the last synchronization date.
 *
 * @param last_sync - The date of the last synchronization. If undefined, it indicates that synchronization has never occurred.
 * @returns A string representing the last synchronization date. If the synchronization happened within the current minute, it returns "Now".
 *          Otherwise, it returns the date in the format "DD MMM, YYYY @HH:MM:SS AM/PM". If the synchronization has never occurred, it returns "Never".
 */
export function lastSyncDate(last_sync: Date | undefined) {
  const lastSync = last_sync ? new Date(last_sync) : undefined;

  if (lastSync) {
    const now = new Date();
    if (
      lastSync.getDate() === now.getDate() &&
      lastSync.getMonth() === now.getMonth() &&
      lastSync.getFullYear() === now.getFullYear() &&
      lastSync.getHours() === now.getHours() &&
      lastSync.getMinutes() === now.getMinutes()
    ) {
      return "Now";
    }
  }

  const lastSyncString = lastSync
    ? `${lastSync.getDate()} ${lastSync.toLocaleString("default", { month: "short" })}, ${lastSync.getFullYear()} @${lastSync.toLocaleTimeString()}`
    : "Never";
  return lastSyncString;
}
