/**
 * Host API Guards
 *
 * Raycast host APIs (getSelectedText, BrowserExtension, Clipboard) are IPC calls
 * into the Raycast app. When the host cannot service them — no accessibility
 * permission, no browser extension installed, no frontmost selection — the call
 * can hang until Raycast kills it with "Request timeout after 5000ms", which
 * surfaces to the user as a crashed command.
 *
 * A try/catch bounds the *error*, not the *wait*. These helpers bound the wait.
 */

import { BrowserExtension, environment, getSelectedText } from "@raycast/api";
import { urlLog } from "./logger";

/**
 * How long we wait on a host IPC call before giving up.
 *
 * Kept below Raycast's own 5000ms request timeout so we degrade gracefully with
 * our own fallback instead of the host terminating the command.
 */
export const HOST_API_TIMEOUT_MS = 2000;

/**
 * Runs a promise with a timeout, resolving to `fallback` if it does not settle in time.
 *
 * Never rejects: a host API that is unavailable is an expected condition on the
 * URL-resolution path, not an error worth failing the command over.
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  fallback: T,
  timeoutMs: number = HOST_API_TIMEOUT_MS,
  label?: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  // Settles rather than rejects, so a rejection that arrives after the timeout has
  // already won the race is still observed. Promise.race does not cancel the loser,
  // and getSelectedText rejects routinely (whenever nothing is selected) — an
  // unobserved late rejection would surface as an unhandled promise rejection.
  const attempt = operation().then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );

  const timeout = new Promise<{ ok: "timeout" }>((resolve) => {
    timer = setTimeout(() => resolve({ ok: "timeout" }), timeoutMs);
  });

  try {
    const result = await Promise.race([attempt, timeout]);

    if (result.ok === "timeout") {
      urlLog.warn("host-api:timeout", { api: label, timeoutMs });
      return fallback;
    }

    if (result.ok) {
      return result.value;
    }

    urlLog.log("host-api:unavailable", { api: label });
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

/** Whether we are running on Raycast for Windows. */
export const isWindows = process.platform === "win32";

/** Whether we are running on macOS. */
export const isMacOS = process.platform === "darwin";

/**
 * Whether the Raycast browser extension is available to this command.
 *
 * Raycast does not offer the Browser Extension API on Windows at all, so the platform
 * check short-circuits before we ever touch the host.
 *
 * `environment.canAccess` answers the rest locally. The previous approach — calling
 * `BrowserExtension.getTabs()` and seeing whether it threw — paid a full IPC round-trip,
 * and a 5s hang, just to learn the extension is absent.
 */
export function hasBrowserExtension(): boolean {
  if (isWindows) {
    return false;
  }

  return environment.canAccess(BrowserExtension);
}

/**
 * Reads the frontmost app's selected text, or null.
 *
 * Rejects when nothing is selected (documented), and can hang on Windows when
 * accessibility permission has not been granted — so it is both caught and bounded.
 */
export async function getSelectedTextSafe(): Promise<string | null> {
  return withTimeout(async () => (await getSelectedText()) || null, null, HOST_API_TIMEOUT_MS, "getSelectedText");
}

/**
 * Lists open browser tabs, or an empty array if the extension is unavailable.
 */
export async function getBrowserTabsSafe(): Promise<Awaited<ReturnType<typeof BrowserExtension.getTabs>>> {
  if (!hasBrowserExtension()) {
    urlLog.log("host-api:skip", { api: "getTabs", reason: "no browser extension" });
    return [];
  }

  return withTimeout(() => BrowserExtension.getTabs(), [], HOST_API_TIMEOUT_MS, "getTabs");
}
