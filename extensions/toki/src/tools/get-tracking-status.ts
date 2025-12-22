import { getTrackingStatus } from "../db";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return "0m";
}

/**
 * Get the current time tracking session, if any
 */
export default async function tool() {
  const tracking = await getTrackingStatus();
  if (!tracking) return null;

  const elapsed = Math.floor(Date.now() / 1000) - tracking.startTime;
  return {
    groupTitle: tracking.groupTitle,
    activityTitle: tracking.activityTitle,
    startTime: new Date(tracking.startTime * 1000).toISOString(),
    elapsedTime: formatDuration(elapsed),
  };
}
