import { MiteClient } from "./client";
import type { MiteTracker } from "./types";

/**
 * Fetches current tracker state from mite API
 */
export async function getTracker(): Promise<MiteTracker> {
  const client = new MiteClient();
  const response = await client.get<{ tracker: MiteTracker }>("/tracker.json");
  return response.tracker;
}

/**
 * Starts tracking time for a specific time entry
 */
export async function startTracker(timeEntryId: number): Promise<MiteTracker> {
  const client = new MiteClient();
  const response = await client.patch<{ tracker: MiteTracker }>(
    `/tracker/${timeEntryId}.json`,
  );
  return response.tracker;
}

/**
 * Stops tracking time for a specific time entry
 */
export async function stopTracker(timeEntryId: number): Promise<MiteTracker> {
  const client = new MiteClient();
  const response = await client.delete<{ tracker: MiteTracker }>(
    `/tracker/${timeEntryId}.json`,
  );
  return response.tracker;
}

/**
 * Checks if tracker is currently running
 */
export function isTrackerRunning(tracker: MiteTracker): boolean {
  return !!tracker.tracking_time_entry;
}

/**
 * Gets the ID of currently running time entry, if any
 */
export function getRunningEntryId(tracker: MiteTracker): number | null {
  return tracker.tracking_time_entry?.id || null;
}

/**
 * Calculates total elapsed minutes including any previously tracked time
 */
export function calculateElapsedMinutes(tracker: MiteTracker): number {
  if (!tracker.tracking_time_entry) return 0;

  const since = new Date(tracker.tracking_time_entry.since);
  const now = new Date();
  const elapsedMs = now.getTime() - since.getTime();
  return (
    Math.floor(elapsedMs / 60000) + (tracker.tracking_time_entry.minutes || 0)
  );
}
