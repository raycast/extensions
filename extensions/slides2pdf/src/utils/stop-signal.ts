import { LocalStorage } from "@raycast/api";

// Raycast runs every command in its own process, so the Stop Conversion command cannot reach the
// running conversion directly. Both sides meet in LocalStorage — through a single timestamp that
// is written and never cleared: a conversion obeys a stop request made at or after its own start,
// so an old request cannot stop a later run, nothing has to be reset, and concurrent runs cannot
// interfere with each other's state because there is no per-run state at all.
const STOP_REQUESTED_AT = "conversionStopRequestedAt";

export async function requestStop(): Promise<void> {
  await LocalStorage.setItem(STOP_REQUESTED_AT, Date.now().toString());
}

// `>=`, not `>`: a stop pressed in the same millisecond the conversion started must still count.
export async function isStopRequested(startedAt: number): Promise<boolean> {
  const at = Number(await LocalStorage.getItem<string>(STOP_REQUESTED_AT));
  return Number.isFinite(at) && at >= startedAt;
}
