import { Cache } from "@raycast/api";
import { getJumpseatConfiguration } from "./config";
import { REQUEST_TIMEOUT_MS } from "./http";
import {
  isWhiteAirlineLogos,
  parseWhiteAirlineLogos,
  type WhiteAirlineLogos,
} from "./white-airline-logos";

const CACHE_KEY = "white-airline-logos-v1";
// The manifest is about 170KB compressed and changes only when logos are
// published, so the menu bar (refreshed every minute) checks it a few times a
// day, and retries a failed check after a short pause.
const REFRESH_AFTER_MS = 6 * 60 * 60 * 1000;
const RETRY_AFTER_MS = 15 * 60 * 1000;

interface StoredWhiteAirlineLogos {
  etag: string | null;
  nextCheckAt: number;
  logos: WhiteAirlineLogos;
}

let cache: Cache | undefined;
function logoCache(): Cache {
  cache ??= new Cache({ namespace: "airline-logo-manifest" });
  return cache;
}

function readStored(): StoredWhiteAirlineLogos | undefined {
  try {
    const raw = logoCache().get(CACHE_KEY);
    if (!raw) return undefined;
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return undefined;
    const stored = value as Partial<StoredWhiteAirlineLogos>;
    if (
      (stored.etag !== null && typeof stored.etag !== "string") ||
      typeof stored.nextCheckAt !== "number" ||
      !isWhiteAirlineLogos(stored.logos)
    ) {
      return undefined;
    }
    return stored as StoredWhiteAirlineLogos;
  } catch {
    return undefined;
  }
}

function writeStored(stored: StoredWhiteAirlineLogos): void {
  try {
    logoCache().set(CACHE_KEY, JSON.stringify(stored));
  } catch {
    // A missing cache only costs another manifest download.
  }
}

export function cachedWhiteAirlineLogos(): WhiteAirlineLogos {
  return readStored()?.logos ?? {};
}

// Cloudflare weakens the ETag when it compresses the response, while the API
// compares If-None-Match against the strong value it sent.
function strongEtag(value: string | null): string | null {
  return value?.replace(/^W\//, "") ?? null;
}

// Never throws: without the manifest the menu bar keeps the airline's own logo.
export async function loadWhiteAirlineLogos(
  now = Date.now(),
): Promise<WhiteAirlineLogos> {
  const stored = readStored();
  if (stored && now < stored.nextCheckAt) return stored.logos;

  const retryLater = (): WhiteAirlineLogos => {
    writeStored({
      etag: stored?.etag ?? null,
      nextCheckAt: now + RETRY_AFTER_MS,
      logos: stored?.logos ?? {},
    });
    return stored?.logos ?? {};
  };

  try {
    const url = new URL(
      "/api/v1/airlines/logos/manifest/v2",
      getJumpseatConfiguration().apiBaseUrl,
    );
    const headers: Record<string, string> = { Accept: "application/json" };
    if (stored?.etag) headers["If-None-Match"] = stored.etag;
    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (response.status === 304 && stored) {
      writeStored({ ...stored, nextCheckAt: now + REFRESH_AFTER_MS });
      return stored.logos;
    }
    if (!response.ok) return retryLater();

    const logos = parseWhiteAirlineLogos(await response.json());
    if (!logos) return retryLater();
    writeStored({
      etag: strongEtag(response.headers.get("etag")),
      nextCheckAt: now + REFRESH_AFTER_MS,
      logos,
    });
    return logos;
  } catch {
    return retryLater();
  }
}
