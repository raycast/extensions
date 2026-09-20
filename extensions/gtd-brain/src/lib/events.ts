import { environment } from "@raycast/api";
import { backendFetch } from "./backend";
import { CLIENT, SURFACE } from "./config";
import { storageGet, storageSet } from "./storage";

// Fire-and-forget analytics (APP_STANDARDS S7): snake_case names, only human-initiated
// actions, failures swallowed. Every payload names this surface and the command that was
// running. The promise never rejects; a caller about to exit (a no-view command, popToRoot)
// awaits it so the request is not cut off with the process.
export function sendEvent(name: string, payload: Record<string, unknown> = {}): Promise<void> {
  const body = JSON.stringify({ name, payload: { surface: SURFACE, command: environment.commandName, ...payload } });
  const request = backendFetch(`/api/${CLIENT}/v2/events`, { method: "POST", body }).then(
    () => undefined,
    () => undefined,
  );
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, EVENT_TIMEOUT_MS));
  return Promise.race([request, timeout]);
}

export const EVENT_TIMEOUT_MS = 3000;

// Every Raycast command launch is its own short-lived process, so "once per launch" is
// defined the way the web defines a browser session: one app_opened per run of activity,
// a new one after SESSION_GAP_MS of silence. The guard is persisted so it holds across
// command processes.
export const SESSION_GAP_MS = 30 * 60 * 1000;
const LAST_ACTIVE_KEY = "last_active_at";

export async function appOpened(now: number = Date.now()): Promise<boolean> {
  const last = (await storageGet<number>(LAST_ACTIVE_KEY)) ?? 0;
  await storageSet(LAST_ACTIVE_KEY, now);
  if (now - last < SESSION_GAP_MS) return false;
  await sendEvent("app_opened", { launchType: environment.launchType });
  return true;
}
