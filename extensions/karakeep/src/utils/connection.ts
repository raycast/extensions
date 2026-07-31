/**
 * Connection-failure detection.
 *
 * A `fetch` that never reaches the server rejects with `TypeError: fetch failed`,
 * whose `message` carries no diagnostic value and which serializes to `{}` — the
 * actual cause (ECONNREFUSED, ENOTFOUND, …) is hidden on `error.cause.code`.
 * Everything here exists to pull that out so callers can distinguish "the server
 * said no" from "there was no server".
 */

/** Node/undici cause codes that mean the request never reached a server. */
const CONNECTION_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "ECONNRESET",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
]);

interface ErrorCause {
  code?: string;
  message?: string;
}

function getCause(error: unknown): ErrorCause | undefined {
  if (!(error instanceof Error) || !("cause" in error)) return undefined;
  const cause = (error as Error & { cause?: unknown }).cause;
  if (typeof cause !== "object" || cause === null) return undefined;
  return cause as ErrorCause;
}

/** The underlying syscall/undici code, e.g. `ECONNREFUSED`. */
export function getConnectionErrorCode(error: unknown): string | undefined {
  return getCause(error)?.code;
}

/**
 * True when the request never reached a server.
 *
 * Deliberately does NOT treat an HTTP error as a connection failure: a 401 or a
 * 500 proves the server IS up, and offering to start a container in that case
 * would send the user down the wrong path.
 */
export function isConnectionError(error: unknown): boolean {
  const code = getConnectionErrorCode(error);
  if (code && CONNECTION_ERROR_CODES.has(code)) return true;

  // Fall back to the shape undici gives us when no cause code is attached.
  return error instanceof TypeError && error.message === "fetch failed";
}

/**
 * A message worth putting in front of a user — and worth copying to the
 * clipboard. `error.message` alone would be the useless string "fetch failed".
 */
export function describeConnectionError(error: unknown, apiUrl?: string): string {
  const code = getConnectionErrorCode(error);
  const target = apiUrl ? ` at ${apiUrl}` : "";

  switch (code) {
    case "ECONNREFUSED":
      return `Connection refused${target}. Nothing is listening on that port.`;
    case "ENOTFOUND":
      return `Host not found${target}. Check the API URL.`;
    case "ETIMEDOUT":
    case "UND_ERR_CONNECT_TIMEOUT":
      return `Connection timed out${target}.`;
    case "ECONNRESET":
      return `Connection reset${target}.`;
    case "EHOSTUNREACH":
    case "ENETUNREACH":
      return `Host unreachable${target}.`;
    default:
      return code ? `Could not connect${target} (${code}).` : `Could not connect${target}.`;
  }
}

/** Hosts that indicate the instance runs on this machine. */
export function isLocalHost(apiUrl: string): boolean {
  let host: string;
  try {
    host = new URL(apiUrl).hostname.toLowerCase();
  } catch {
    return false;
  }

  if (host === "localhost" || host === "::1" || host.endsWith(".local") || host.endsWith(".localhost")) {
    return true;
  }
  // Loopback, private, and link-local ranges — an instance on the LAN is still
  // plausibly a container the user can start, but only from this machine if it
  // is loopback. Keep the net wide; the Docker probe is the real gate.
  return (
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  );
}

/**
 * Whether the API answers at all.
 *
 * Any HTTP response counts — a 401 proves the server is up just as well as a
 * 200, and callers only need to know whether a request can be attempted. The
 * timeout matters: without it an unroutable host hangs for the OS default
 * rather than failing fast.
 */
export async function isApiReachable(apiUrl: string, timeoutMs = 3_000): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetch(new URL("/api/v1/bookmarks?limit=1", apiUrl).toString(), { signal: controller.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** The host port the instance should be reachable on, for container matching. */
export function getPortFromUrl(apiUrl: string): string | undefined {
  try {
    const url = new URL(apiUrl);
    if (url.port) return url.port;
    if (url.protocol === "https:") return "443";
    if (url.protocol === "http:") return "80";
    return undefined;
  } catch {
    return undefined;
  }
}
