// Kaset's now-playing payload never carries an album (its parser hardcodes
// `album: nil`), so resolve it here by searching YouTube Music for the current
// track and reading the album off the best match. The Now Playing command
// re-renders every second for progress; results are cached by video id so each
// track is searched at most once and repeats are served from cache.
import { Cache } from "@raycast/api";
import { pickAlbum, searchYouTubeMusic } from "./search";

const cache = new Cache({ namespace: "kaset-control" });
const ALBUM_KEY_PREFIX = "album.";

export async function resolveAlbum(
  id: string,
  title: string,
  artist: string,
): Promise<string | undefined> {
  if (!id || !title) return undefined;

  const cached = cache.get(ALBUM_KEY_PREFIX + id);
  // An empty string is a cached miss: the search ran but found no album, so
  // there is no point repeating it every poll tick.
  if (cached !== undefined) return cached || undefined;

  let album: string | undefined;
  try {
    const results = await searchYouTubeMusic(`${title} ${artist}`.trim());
    album = pickAlbum(results, id, artist);
  } catch {
    // A transient failure must not be cached, so a later change can retry.
    return undefined;
  }

  try {
    cache.set(ALBUM_KEY_PREFIX + id, album ?? "");
  } catch {
    // Cache writes are an optimisation; never let one break playback control.
  }

  return album;
}
