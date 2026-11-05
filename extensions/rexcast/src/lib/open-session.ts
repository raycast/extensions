import { markSeen } from "./activity";
import { showSession } from "./rex";

/** Shows a session in Rex and counts it as seen, so its finished/failed marks clear whichever command opened it. */
export async function openSession(id: string) {
  await showSession(id);
  await markSeen(id);
}
