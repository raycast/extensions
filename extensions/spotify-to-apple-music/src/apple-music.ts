export type SpotifyTrack = {
  uri: string;
  name: string;
  artist: string;
};

type AppleMusicSong = {
  trackName?: string;
  artistName?: string;
  trackViewUrl?: string;
};

type AppleMusicSearchResponse = {
  results?: AppleMusicSong[];
};

export async function findAppleMusicUrl(
  track: SpotifyTrack,
  country: string,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  try {
    const params = new URLSearchParams({
      term: `${track.artist} ${track.name}`,
      media: "music",
      entity: "song",
      limit: "5",
      country,
    });

    const response = await fetchFn(
      `https://itunes.apple.com/search?${params.toString()}`,
    );
    if (!response.ok) {
      throw new Error(
        `Apple Music search failed with status ${response.status}.`,
      );
    }

    const payload = (await response.json()) as AppleMusicSearchResponse;
    const exactishMatch = payload.results?.find((song) =>
      isSameSong(track, song),
    );
    return (
      exactishMatch?.trackViewUrl ?? buildAppleMusicSearchUrl(track, country)
    );
  } catch {
    return buildAppleMusicSearchUrl(track, country);
  }
}

export function buildAppleMusicSearchUrl(
  track: SpotifyTrack,
  country: string,
): string {
  const params = new URLSearchParams({
    term: `${track.artist} ${track.name}`,
  });

  return `https://music.apple.com/${country.toLowerCase()}/search?${params.toString()}`;
}

function isSameSong(track: SpotifyTrack, song: AppleMusicSong): boolean {
  const trackTitle = normalizeTitle(track.name);
  const songTitle = normalizeTitle(song.trackName ?? "");
  const trackArtist = normalizeText(track.artist);
  const songArtist = normalizeText(song.artistName ?? "");

  return (
    trackTitle === songTitle &&
    (trackArtist === songArtist ||
      trackArtist.includes(songArtist) ||
      songArtist.includes(trackArtist))
  );
}

function normalizeTitle(value: string): string {
  return normalizeText(
    value
      .replace(/\((.*?)\)/g, " ")
      .replace(/\[(.*?)\]/g, " ")
      .replace(/\b(feat\.?|featuring)\b.*$/i, " "),
  );
}

function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}
