import { LocalStorage } from "@raycast/api";

// Raycast runs every command in its own process, so the Stop Conversion command cannot reach the
// running conversion directly. Both sides meet in LocalStorage: the conversion leaves a heartbeat
// while it works and watches for a stop request between files.
const HEARTBEAT = "conversionHeartbeat";
const STOP_REQUESTED_AT = "conversionStopRequestedAt";

// A single file may occupy an engine for up to its ten-minute timeout, so a heartbeat older than
// that is not a slow conversion but a run that died without cleaning up.
const STALE_AFTER_MS = 11 * 60 * 1000;

// The stop request is a timestamp, not a flag, and is never cleared: a conversion obeys it only if
// it was made after that conversion started. An old request therefore cannot stop a later run, and
// nothing has to be reset — which matters because two conversions can be running at once, and a
// flag cleared by the one that finishes first would swallow the other one's stop request.
export async function beginConversion(): Promise<number> {
  const startedAt = Date.now();
  await markAlive();
  return startedAt;
}

export async function markAlive(): Promise<void> {
  await LocalStorage.setItem(HEARTBEAT, Date.now().toString());
}

export async function endConversion(): Promise<void> {
  await LocalStorage.removeItem(HEARTBEAT);
}

export async function isStopRequested(startedAt: number): Promise<boolean> {
  const at = Number(await LocalStorage.getItem<string>(STOP_REQUESTED_AT));
  return Number.isFinite(at) && at > startedAt;
}

export async function isConversionRunning(): Promise<boolean> {
  const beat = await LocalStorage.getItem<string>(HEARTBEAT);
  const at = Number(beat);
  return Boolean(beat) && Number.isFinite(at) && Date.now() - at < STALE_AFTER_MS;
}

export async function requestStop(): Promise<void> {
  await LocalStorage.setItem(STOP_REQUESTED_AT, Date.now().toString());
}
