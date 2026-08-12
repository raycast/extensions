import { logger, redactString } from "@chrismessina/raycast-logger";

/**
 * Shared loggers for the extension. Verbose levels (`log`/`debug`) only emit when the
 * `verboseLogging` preference is enabled; `warn`/`error`/`info` always emit.
 *
 * NOTE: Raycast disables console logging for Store-installed extensions, so these logs are a
 * development / "Use Node production environment" diagnostic — not field telemetry.
 */
export const apiLog = logger.child("[API]");
export const viewLog = logger.child("[View]");
export const menuLog = logger.child("[MenuBar]");
export const storeLog = logger.child("[Storage]");

/**
 * Strip credentials from a URL before logging it.
 *
 * MEASURED (2026-07-27): `@chrismessina/raycast-logger`'s redaction catches a bare `ghp_…`
 * token and a `token:` field, but does NOT catch one embedded in a URL — neither
 * `?access_token=<PAT>` nor userinfo (`https://user:<PAT>@host`) is redacted by `redactString`
 * or `sanitizeArgs`. This extension sends its PAT in an `Authorization` header, never in a URL,
 * so nothing leaks today — but `fetchAllPages` interpolates request URLs into errors, and one
 * refactor toward query-param auth would start leaking silently.
 *
 * Always pass request URLs through this before handing them to a logger.
 */
export function safeUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.username || u.password) {
      u.username = "***";
      u.password = "";
    }
    // Match case- and separator-insensitively: `accessToken`, `ACCESS_TOKEN`, and `access-token`
    // all normalize to the same key. A strict list missed camelCase variants entirely.
    const isSensitive = (name: string) =>
      ["accesstoken", "token", "clientsecret", "apikey", "password", "secret", "auth", "key", "sig"].includes(
        name.toLowerCase().replace(/[_-]/g, ""),
      );
    for (const name of [...u.searchParams.keys()]) {
      if (isSensitive(name)) u.searchParams.set(name, "***");
    }
    // Fragments carry credentials in OAuth implicit flows and are NOT covered by searchParams.
    if (u.hash) {
      const frag = new URLSearchParams(u.hash.replace(/^#/, ""));
      let touched = false;
      for (const name of [...frag.keys()]) {
        if (isSensitive(name)) {
          frag.set(name, "***");
          touched = true;
        }
      }
      if (touched) u.hash = `#${frag.toString()}`;
    }
    return u.toString();
  } catch {
    // Unparseable input can't be structurally scrubbed. Fall back to the logger's own
    // pattern-based redaction rather than returning the raw string.
    return redactString(url);
  }
}

/** Extract a human-readable message from an unknown thrown value. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return String(error);
}
