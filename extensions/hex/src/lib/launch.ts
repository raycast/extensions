import { errorCode, hex } from "./hex";

const LAUNCH_TIMEOUT_MS = 10_000;
const SETUP_WAIT_MS = 3_000;
const SETUP_POLL_MS = 200;
export const SETTING_UP = "not-ready";

export async function openingHex<T>(attempt: () => Promise<T>): Promise<T> {
  try {
    return await attempt();
  } catch (error) {
    if (errorCode(error) !== "not-running") throw error;
  }
  await hex(["start"], { timeoutMs: LAUNCH_TIMEOUT_MS });
  const deadline = Date.now() + SETUP_WAIT_MS;
  for (;;) {
    try {
      return await attempt();
    } catch (error) {
      if (errorCode(error) !== SETTING_UP || Date.now() >= deadline) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, SETUP_POLL_MS));
    }
  }
}
