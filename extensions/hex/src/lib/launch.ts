import { Application, getFrontmostApplication, open } from "@raycast/api";
import { errorCode, hex } from "./hex";

const LAUNCH_TIMEOUT_MS = 25_000;
const SETUP_WAIT_MS = 3_000;
const SETUP_POLL_MS = 200;
export const SETTING_UP = "not-ready";
const STILL_STARTING = new Set(["not-running", SETTING_UP]);

// `hex start` opens Hex's window in front of the app the dictation should type into.
async function refocus(app: Application | undefined) {
  try {
    await hex(["window", "hide"]);
    if (app) await open(app.path);
  } catch {
    // Focus is a convenience; the dictation still starts.
  }
}

export async function openingHex<T>(attempt: () => Promise<T>): Promise<T> {
  try {
    return await attempt();
  } catch (error) {
    if (errorCode(error) !== "not-running") throw error;
  }
  const frontmost = await getFrontmostApplication().catch(() => undefined);
  await hex(["start"], { timeoutMs: LAUNCH_TIMEOUT_MS });
  await refocus(frontmost);
  const deadline = Date.now() + SETUP_WAIT_MS;
  for (;;) {
    try {
      return await attempt();
    } catch (error) {
      if (!STILL_STARTING.has(errorCode(error) ?? "") || Date.now() >= deadline) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, SETUP_POLL_MS));
    }
  }
}
