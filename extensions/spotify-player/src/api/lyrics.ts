const REQUEST_TIMEOUT_MS = 10000;
const LRCLIB_API_URL = "https://lrclib.net/api/get";

export type LyricsQuery = {
  title: string;
  artist: string;
  album: string;
  duration: number;
};

export type LyricsResult = {
  lyrics: string | null;
  instrumental?: boolean;
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

function removeSyncedTimestamps(lyrics: string): string {
  return lyrics
    .split("\n")
    .map((line) => line.replace(/^\[\d{2}:\d{2}(?:\.\d{2,3})?\]\s*/, "").trim())
    .filter(Boolean)
    .join("\n");
}

function normalizeLyrics(lyrics?: string | null): string | null {
  const normalized = lyrics
    ?.split("\n")
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
    album_name: query.album,
    duration: String(query.duration),
  });

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

    return {
      lyrics: normalizeLyrics(result.plainLyrics) || normalizeLyrics(removeSyncedTimestamps(result.syncedLyrics || "")),
    };
  } catch (error) {
    console.error("Error fetching lyrics:", error);
    return { lyrics: null };
  }
}
