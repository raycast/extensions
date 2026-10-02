/**
 * Connection-failure detection.
 *
 * A `fetch` that never reaches the server rejects with `TypeError: fetch failed`,
 * whose `message` carries no diagnostic value and which serializes to `{}` — the
 * actual cause (ECONNREFUSED, ENOTFOUND, …) is hidden on `error.cause.code`.
 * Everything here exists to pull that out so callers can distinguish "the server
 * said no" from "there was no server".
 */
import { clearRejectedKey, markKeyRejected } from "./apiError";
import { getApiConfig } from "./config";

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

/**
 * Whether the instance is served by THIS machine — i.e. loopback only.
 *
 * Deliberately excludes private-LAN and link-local ranges (10.x, 192.168.x,
 * 172.16–31.x, 169.254.x). Those hosts are "local" in a network sense but are
 * NOT this machine, and container recovery keys off a published port binding,
 * which only ever reaches loopback.
 *
 * Including them let a Karakeep on a NAS at 192.168.1.50:3000 match an
 * unrelated stopped container that happened to publish host port 3000 — the
 * lookup matches on port alone and cannot know which host a container serves.
 * The extension would then start someone else's Compose project and poll a
 * remote address for 60s. Starting the wrong containers is a real side effect
 * on the user's machine; doing nothing is strictly better.
 */
export function isLocalHost(apiUrl: string): boolean {
  let host: string;
  try {
    host = new URL(apiUrl).hostname.toLowerCase();
  } catch {
    return false;
  }

  return host === "localhost" || host === "::1" || host === "[::1]" || /^127\./.test(host);
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

/** What one probe request can tell us about the configured instance. */
type ApiProbeResult = "ok" | "unauthorized" | "unreachable";

/**
 * Is the server there, AND is our key good — in a single request.
 *
 * `isApiReachable` deliberately answers only the first half, which is right for
 * "can I attempt a write" but is what let a bad key cascade: the probe passed,
 * every gate opened, and each view then fired its own doomed request and its own
 * toast. A wrong key produced "Couldn't load lists HTTP 401" over a bookmarks
 * command the user never asked to load lists for.
 *
 * `/api/v1/users/me` because it is the cheapest authenticated route Karakeep
 * has — it answers 401 for a bad, missing or expired bearer and carries no
 * payload worth fetching. Verified against a live instance: bad key → 401 with
 * the plain-text body `Unauthorized`.
 *
 * Fails OPEN on anything that is not a 401. An older instance without this route
 * answers 404, and a 404 must not lock the user out of an extension whose key is
 * perfectly good — only an explicit 401 is treated as a rejected key.
 */
export async function probeApi(apiUrl: string, timeoutMs = 3_000): Promise<ApiProbeResult> {
  // Read the config OUTSIDE the request try/catch. getApiConfig throws when the
  // key is blank, and swallowing that into "unreachable" would tell a first-run
  // user Karakeep isn't running — pointing them at Docker when the fix is to
  // paste a key into Settings. No key is a credential problem, not a network one.
  let apiKey: string;
  try {
    ({ apiKey } = await getApiConfig());
  } catch {
    return "unauthorized";
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(new URL("/api/v1/users/me", apiUrl).toString(), {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      signal: controller.signal,
    });

    // This probe OWNS the rejected-key latch, and that is what keeps the latch
    // from being a trap. Once a key is latched the fetch layer short-circuits
    // every request without touching the network, so nothing routed through it
    // can ever produce the success that would clear it — a key that starts
    // working again (an interleaved 401 during a restart, a token re-provisioned
    // server-side) would stay locked out for the rest of the run. probeApi does
    // not go through that layer, so it is always able to ask the server again.
    if (response.status === 401) {
      markKeyRejected(apiKey);
      return "unauthorized";
    }
    clearRejectedKey(apiKey);
    return "ok";
  } catch {
    return "unreachable";
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

/**
 * Whether the server at the configured URL identifies as Karakeep.
 *
 * `isApiReachable` deliberately accepts ANY HTTP response, which is right for
 * "can I make a request" but useless for "is this actually my instance" — an
 * unrelated app holding the same port answers just as well.
 *
 * This asks the application rather than inspecting the container image, because
 * users run forks and custom tags: a /karakeep/i match on the image would be a
 * false negative for them and a false positive for anything else named after
 * the project.
 *
 * A wrong API key produces the same "no" as a stranger's server. That is the
 * intended trade for a caller about to do something destructive — the message
 * names both possibilities.
 */
export async function respondsAsKarakeep(timeoutMs = 5_000): Promise<boolean> {
  try {
    const { apiUrl, apiKey } = await getApiConfig();
    const response = await fetch(new URL("/api/v1/lists", apiUrl).toString(), {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return false;
    const body = await response.json();
    return Array.isArray((body as { lists?: unknown })?.lists);
  } catch {
    return false;
  }
}
