import { LocalStorage } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type LookupKind = "track" | "artist" | "album";

type CachedEligibleMedia = {
  payload: Record<string, unknown>;
  cachedAt: number;
};

const CACHE_KEYS: Record<LookupKind, string> = {
  track: "cached-eligible-media-track",
  artist: "cached-eligible-media-artist",
  album: "cached-eligible-media-album",
};

export type MediaControlDebugInfo = {
  query: string | null;
  stdout: string;
  stderr: string;
  error: string | null;
  payload: unknown | null;
  binary: string | null;
  attempts: string[];
  isNotInstalled: boolean;
};

type LookupOptions = {
  allowCacheFallbackOnIneligible?: boolean;
};

function isMissingBinaryError(error: unknown): boolean {
  const code =
    error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code || "") : "";
  if (code === "ENOENT") {
    return true;
  }

  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message || "")
      : String(error || "");
  return message.includes("ENOENT") || message.toLowerCase().includes("not found");
}

function readStringField(payload: unknown, key: string): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
}

function asPayloadRecord(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  return payload as Record<string, unknown>;
}

export function formatNowPlayingSearchQuery(payload: unknown): string | null {
  const title = readStringField(payload, "title");
  const artist = readStringField(payload, "artist");

  if (!title) {
    return null;
  }

  return [title, artist].filter(Boolean).join(" ");
}

export function formatNowPlayingAlbumSearchQuery(payload: unknown): string | null {
  const album = readStringField(payload, "album");

  if (!album) {
    return null;
  }

  return album;
}

function queryForLookupKind(payload: unknown, kind: LookupKind): string | null {
  const album = readStringField(payload, "album");
  if (!album) {
    return null;
  }

  if (kind === "album") {
    return formatNowPlayingAlbumSearchQuery(payload);
  }
  return formatNowPlayingSearchQuery(payload);
}

async function saveEligibleMedia(kind: LookupKind, payload: Record<string, unknown>): Promise<void> {
  try {
    await LocalStorage.setItem(
      CACHE_KEYS[kind],
      JSON.stringify({
        payload,
        cachedAt: Date.now(),
      } satisfies CachedEligibleMedia),
    );
  } catch {
    // Ignore cache write failures; lookup should still continue with live media.
  }
}

async function readEligibleMedia(kind: LookupKind): Promise<Record<string, unknown> | null> {
  try {
    const cachedRaw = await LocalStorage.getItem<string>(CACHE_KEYS[kind]);
    if (!cachedRaw || typeof cachedRaw !== "string") {
      return null;
    }

    const parsed = JSON.parse(cachedRaw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const payload = asPayloadRecord((parsed as CachedEligibleMedia).payload);
    return payload;
  } catch {
    return null;
  }
}

export async function inspectNowPlaying(): Promise<MediaControlDebugInfo> {
  if (process.platform !== "darwin") {
    return {
      query: null,
      stdout: "",
      stderr: "",
      error: "media-control is only supported on macOS",
      payload: null,
      binary: null,
      attempts: [],
      isNotInstalled: false,
    };
  }

  const candidates = [
    "media-control",
    "/opt/homebrew/bin/media-control",
    "/usr/local/bin/media-control",
    "/opt/local/bin/media-control",
    "/opt/homebrew/opt/media-control/bin/media-control",
    "/usr/local/opt/media-control/bin/media-control",
  ];
  const attempts: string[] = [];
  let missingBinaryAttempts = 0;
  const envPath = [process.env.PATH, "/opt/homebrew/bin", "/usr/local/bin", "/opt/local/bin"].filter(Boolean).join(":");

  for (const mediaControlBinary of candidates) {
    try {
      const { stdout, stderr } = await execFileAsync(mediaControlBinary, ["get"], {
        timeout: 3000,
        maxBuffer: 1024 * 1024,
        env: {
          ...process.env,
          PATH: envPath,
        },
      });

      const payload = JSON.parse(stdout) as unknown;
      return {
        query: formatNowPlayingSearchQuery(payload),
        stdout,
        stderr,
        error: null,
        payload,
        binary: mediaControlBinary,
        attempts,
        isNotInstalled: false,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isMissingBinaryError(error)) {
        missingBinaryAttempts += 1;
      }
      attempts.push(`${mediaControlBinary}: ${message}`);
    }
  }
  const isNotInstalled = missingBinaryAttempts === candidates.length;

  return {
    query: null,
    stdout: "",
    stderr: "",
    error: attempts.at(-1) || "Failed to execute media-control",
    payload: null,
    binary: null,
    attempts,
    isNotInstalled,
  };
}

export async function inspectNowPlayingForLookup(
  kind: LookupKind,
  options?: LookupOptions,
): Promise<MediaControlDebugInfo> {
  const info = await inspectNowPlaying();
  const livePayload = asPayloadRecord(info.payload);
  const allowCacheFallbackOnIneligible = options?.allowCacheFallbackOnIneligible === true;
  if (livePayload) {
    const liveQuery = queryForLookupKind(livePayload, kind);
    if (liveQuery) {
      await saveEligibleMedia(kind, livePayload);
      return {
        ...info,
        payload: livePayload,
        query: liveQuery,
      };
    }

    if (allowCacheFallbackOnIneligible) {
      const cachedPayload = await readEligibleMedia(kind);
      const cachedQuery = queryForLookupKind(cachedPayload, kind);
      if (cachedPayload && cachedQuery) {
        return {
          ...info,
          payload: cachedPayload,
          query: cachedQuery,
        };
      }
    }

    return {
      ...info,
      payload: null,
      query: null,
    };
  }

  const cachedPayload = await readEligibleMedia(kind);
  const cachedQuery = queryForLookupKind(cachedPayload, kind);
  if (cachedPayload && cachedQuery) {
    return {
      ...info,
      payload: cachedPayload,
      query: cachedQuery,
    };
  }

  return {
    ...info,
    payload: null,
    query: null,
  };
}
