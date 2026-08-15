export type AsideErrorKind = "not-installed" | "permission-denied" | "no-window" | "stale-tab" | "unknown";

export class AsideError extends Error {
  constructor(
    public readonly kind: AsideErrorKind,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "AsideError";
  }
}

export function normalizeAsideError(error: unknown): AsideError {
  if (error instanceof AsideError) return error;

  const source = error instanceof Error ? error : new Error(String(error));
  const message = source.message;

  if (message.includes("-1743") || /not authorized to send Apple events/i.test(message)) {
    return new AsideError(
      "permission-denied",
      "Raycast does not have permission to control Aside. Enable Raycast → Aside in System Settings → Privacy & Security → Automation.",
      { cause: source },
    );
  }

  if (/application.*(?:isn.t|wasn.t).*found|can.t get application|invalid connection/i.test(message)) {
    return new AsideError("not-installed", "Aside is not installed in the Applications folder.", { cause: source });
  }

  if (message.includes("ASIDE_STALE_TAB") || message.includes("2001")) {
    return new AsideError("stale-tab", "That tab is no longer available. Refresh the list and try again.", {
      cause: source,
    });
  }

  if (message.includes("ASIDE_NO_WINDOW") || message.includes("2002")) {
    return new AsideError("no-window", "Aside could not create a usable browser window.", { cause: source });
  }

  return new AsideError("unknown", message || "Aside could not complete the request.", { cause: source });
}

export function parseJsonResponse<T>(response: string, context: string): T {
  try {
    return JSON.parse(response) as T;
  } catch (error) {
    throw new AsideError("unknown", `Aside returned an invalid ${context} response.`, { cause: error });
  }
}
