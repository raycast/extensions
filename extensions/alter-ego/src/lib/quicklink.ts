import { decodePayload, DecodeResult, encodePayload } from "./payload";
import { AlterEgoPayload } from "./types";

const EXTENSION_HOST = "extensions";
const COMMAND_PATH = "alter-ego/run-for-current-user";
const SEARCH_QUICKLINKS_PATH = "raycast/quicklinks/search-quicklinks";
// Raycast Beta registers its own "raycast-x:" scheme alongside stable's "raycast:",
// so deeplinks must be built for whichever app is actually running this extension
// rather than assuming stable. @raycast/utils' own createDeeplink() reads the same
// env var for the same reason.
const RAYCAST_SCHEME = process.env.RAYCAST_SCHEME ?? "raycast";
const KNOWN_SCHEMES = new Set(["raycast:", "raycast-x:"]);

export function buildRunDeeplink(author: string, payload: AlterEgoPayload): string {
  const args = JSON.stringify({ map: encodePayload(payload) });
  return `${RAYCAST_SCHEME}://${EXTENSION_HOST}/${author}/${COMMAND_PATH}?arguments=${encodeURIComponent(args)}`;
}

export function buildSearchQuicklinksDeeplink(): string {
  return `${RAYCAST_SCHEME}://${EXTENSION_HOST}/${SEARCH_QUICKLINKS_PATH}`;
}

export function isAlterEgoLink(link: string): boolean {
  const url = tryParseUrl(link);
  if (!url) return false;

  return (
    KNOWN_SCHEMES.has(url.protocol) &&
    url.host === EXTENSION_HOST &&
    url.pathname.replace(/^\/+/, "").endsWith(COMMAND_PATH) &&
    url.searchParams.has("arguments")
  );
}

export function extractPayloadFromLink(link: string): DecodeResult {
  if (!isAlterEgoLink(link)) {
    return { ok: false, reason: "not-alter-ego-link" };
  }

  const url = tryParseUrl(link);
  const argsRaw = url?.searchParams.get("arguments");
  if (!argsRaw) {
    return { ok: false, reason: "missing-arguments" };
  }

  let args: unknown;
  try {
    args = JSON.parse(argsRaw);
  } catch {
    return { ok: false, reason: "invalid-json" };
  }

  const map = (args as { map?: unknown } | null)?.map;
  if (typeof map !== "string") {
    return { ok: false, reason: "missing-map-argument" };
  }

  return decodePayload(map);
}

function tryParseUrl(link: string): URL | null {
  if (typeof link !== "string") return null;
  try {
    return new URL(link.trim());
  } catch {
    return null;
  }
}
