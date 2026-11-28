const REQUEST_TIMEOUT_MS = 10000;
const LRCLIB_API_URL = "https://lrclib.net/api/get";
const LEADING_TIMESTAMPS_RE = /^((?:\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\])+)(.*)$/;
const SINGLE_TIMESTAMP_RE = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
const INLINE_WORD_TIMESTAMP_RE = /<\d{1,3}:\d{2}(?:[.:]\d{1,3})?>/g;
const LRC_METADATA_TAG_RE = /^\[(?:ar|al|ti|au|length|by|offset|re|ve|la|id):[^\]]*\]$/i;

export type LyricsQuery = {
  title: string;
  artist: string;
  album: string;
  duration: number;
};

export type SyncedLyricLine = {
  timeMs: number;
  text: string;
};

export type LyricsResult = {
  lyrics: string | null;
  syncedLyrics?: SyncedLyricLine[];
  instrumental?: boolean;
  error?: boolean;
};

type LrclibLyricsResponse = {
  instrumental?: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
};

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "Raycast Spotify Player (https://www.raycast.com/mattisssa/spotify-player)",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function stripInlineWordTimestamps(text: string): string {
  return text.replace(INLINE_WORD_TIMESTAMP_RE, "").replace(/ {2,}/g, " ").trim();
}

export function parseSyncedLyrics(rawSyncedLyrics: string): SyncedLyricLine[] {
  const parsed: SyncedLyricLine[] = [];

  for (const rawLine of rawSyncedLyrics.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || LRC_METADATA_TAG_RE.test(trimmed)) continue;

    const match = trimmed.match(LEADING_TIMESTAMPS_RE);
    if (!match) continue;

    const text = stripInlineWordTimestamps(match[2]);
    SINGLE_TIMESTAMP_RE.lastIndex = 0;

    let tsMatch: RegExpExecArray | null;
    while ((tsMatch = SINGLE_TIMESTAMP_RE.exec(match[1])) !== null) {
      const minutes = Number(tsMatch[1]);
      const seconds = Number(tsMatch[2]);
      const fraction = tsMatch[3] ?? "";
      const ms = fraction ? Number(fraction.padEnd(3, "0")) : 0;
      const timeMs = minutes * 60_000 + seconds * 1000 + ms;
      parsed.push({ timeMs, text });
    }
  }

  parsed.sort((a, b) => a.timeMs - b.timeMs);

  const normalized: SyncedLyricLine[] = [];
  for (const line of parsed) {
    if (line.text.length === 0) {
      // Skip leading instrumental breaks and collapse consecutive empty break lines.
      if (normalized.length === 0 || normalized[normalized.length - 1].text.length === 0) {
        continue;
      }
    }
    normalized.push(line);
  }

  if (!normalized.some((line) => line.text.length > 0)) {
    return [];
  }

  return normalized;
}

export function findActiveLyricIndex(lines: SyncedLyricLine[], positionMs: number): number {
  if (lines.length === 0 || positionMs < lines[0].timeMs) {
    return -1;
  }

  let low = 0;
  let high = lines.length - 1;
  let activeIndex = -1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (lines[mid].timeMs <= positionMs) {
      activeIndex = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return activeIndex;
}

function removeSyncedTimestamps(lyrics: string): string {
  return lyrics
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !LRC_METADATA_TAG_RE.test(line))
    .map((line) => {
      const match = line.match(LEADING_TIMESTAMPS_RE);
      return stripInlineWordTimestamps(match ? match[2] : line);
    })
    .filter(Boolean)
    .join("\n");
}

function normalizeLyrics(lyrics?: string | null): string | null {
  const normalized = lyrics
    ?.split(/\r?\n/)
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return normalized || null;
}

export async function findLyrics(query: LyricsQuery): Promise<LyricsResult> {
  const searchParams = new URLSearchParams({
    track_name: query.title,
    artist_name: query.artist,
    duration: String(query.duration),
  });
  if (query.album) {
    searchParams.set("album_name", query.album);
  }

  try {
    const response = await fetchWithTimeout(`${LRCLIB_API_URL}?${searchParams.toString()}`);

    if (response.status === 404) {
      return { lyrics: null };
    }

    if (!response.ok) {
      throw new Error(`LRCLIB request failed: ${response.status}`);
    }

    const result = (await response.json()) as LrclibLyricsResponse;

    if (result.instrumental) {
      return { lyrics: "Instrumental", instrumental: true };
    }

    const syncedLyrics = result.syncedLyrics ? parseSyncedLyrics(result.syncedLyrics) : [];
    const plainLyrics =
      normalizeLyrics(result.plainLyrics) || normalizeLyrics(removeSyncedTimestamps(result.syncedLyrics || ""));

    return {
      lyrics: plainLyrics,
      ...(syncedLyrics.length > 0 ? { syncedLyrics } : {}),
    };
  } catch (error) {
    console.error("Error fetching lyrics:", error);
    return { lyrics: null, error: true };
  }
}
