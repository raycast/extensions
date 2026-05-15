import { execFile, execFileSync } from "child_process";
import { showToast, Toast } from "@raycast/api";

// -- Failure mode classification --

export enum FailureMode {
  FirefoxNotRunning = "firefox-not-running",
  ExtensionNotInstalled = "extension-not-installed",
  HostNotRunning = "host-not-running",
  Unknown = "unknown",
}

export interface ClassifiedError {
  mode: FailureMode;
  title: string;
  description: string;
}

// -- Firefox process detection --

/**
 * Check if Firefox is currently running on macOS.
 * Uses pgrep with case-insensitive exact match.
 * IMPORTANT: Only call inside async functions (off the render thread).
 */
export function isFirefoxRunning(): boolean {
  try {
    execFileSync("pgrep", ["-xi", "firefox"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export async function isFirefoxRunningAsync(): Promise<boolean> {
  return new Promise((resolve) => {
    execFile("pgrep", ["-xi", "firefox"], (error: unknown) => {
      resolve(!error);
    });
  });
}

// -- Error classification --

/**
 * Classify a raw error into a typed failure mode with user-friendly messages.
 *
 * Decision tree:
 * 1. TypeError "fetch failed" with cause.code ECONNREFUSED:
 *    - Firefox not running -> FirefoxNotRunning
 *    - Firefox running but host not serving -> HostNotRunning
 * 2. Error with "not connected" or "timeout" in message -> ExtensionNotInstalled
 * 3. Everything else -> Unknown
 */
export async function classifyError(error: unknown): Promise<ClassifiedError> {
  // Port file missing — host isn't serving.
  // Check if Firefox is running to distinguish "not running" from "not set up".
  if (error instanceof Error && error.message === "port-file-missing") {
    if (await isFirefoxRunningAsync()) {
      return {
        mode: FailureMode.HostNotRunning,
        title: "Native Host Not Connected",
        description:
          "The Raycast Firefox helper needs to be set up. Make sure the companion extension is installed and the native host is registered.",
      };
    }
    return {
      mode: FailureMode.FirefoxNotRunning,
      title: "Firefox Isn't Running",
      description: "Launch Firefox to see your tabs here",
    };
  }

  // Connection-level failure: host HTTP server is not reachable
  if (error instanceof TypeError && error.message === "fetch failed") {
    const cause = (error as TypeError & { cause?: { code?: string } }).cause;
    if (cause?.code === "ECONNREFUSED") {
      if (!(await isFirefoxRunningAsync())) {
        return {
          mode: FailureMode.FirefoxNotRunning,
          title: "Firefox Isn't Running",
          description: "Launch Firefox to see your tabs here",
        };
      }
      return {
        mode: FailureMode.HostNotRunning,
        title: "Native Host Not Connected",
        description:
          "The Raycast Firefox helper needs to be set up. Make sure the companion extension is installed and the native host is registered.",
      };
    }
  }

  // HTTP-level failure: host is running but extension bridge is broken
  // The native host returns 502 with "Firefox is not connected" when
  // nativeConnected is false in bridge.js
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("not connected") || msg.includes("timeout")) {
      return {
        mode: FailureMode.ExtensionNotInstalled,
        title: "WebExtension Not Connected",
        description:
          "The Firefox companion extension isn't responding. Make sure it's installed and Firefox is running.",
      };
    }
  }

  return {
    mode: FailureMode.Unknown,
    title: "Can't Connect to Firefox",
    description: "Something unexpected went wrong. Try restarting Firefox.",
  };
}

// -- Retry wrapper --

/**
 * Retry an async function with exponential backoff.
 * Default: 3 retries with delays of 1s, 2s, 4s (~7s total before error).
 */
export async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// -- Toast error helper --

/**
 * Show a Raycast failure toast for action errors (switch, close, etc.).
 * Classifies the error and shows a user-friendly message.
 * For FirefoxNotRunning, adds a "Launch Firefox" recovery action.
 */
export async function showActionError(
  error: unknown,
  actionName: string,
): Promise<void> {
  const classified = await classifyError(error);

  const options: Toast.Options = {
    style: Toast.Style.Failure,
    title: `Couldn't ${actionName}`,
    message: classified.description,
  };

  if (classified.mode === FailureMode.FirefoxNotRunning) {
    options.primaryAction = {
      title: "Launch Firefox",
      onAction: (toast) => {
        execFile("open", ["-a", "Firefox"]);
        toast.hide();
      },
    };
  }

  await showToast(options);
}
