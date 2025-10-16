import { LocalStorage } from "@raycast/api";
import { PlaylistTrackObject, TrackObject, EpisodeObject } from "./spotify.api";

export default async function addTrackToPlaylistCache(playlistId: string, track: TrackObject | EpisodeObject) {
  const cacheKey = `playlistItems_${playlistId}`;
  const cacheTimestampKey = `${cacheKey}_cachedAt`;

  const cached = await LocalStorage.getItem<string>(cacheKey);
  if (!cached) return;

  try {
    const parsed = JSON.parse(cached);
    const newTrackEntry: PlaylistTrackObject = {
      uri: track.uri,
    };

    parsed.push(newTrackEntry?.uri);

    await Promise.all([
      LocalStorage.setItem(cacheKey, JSON.stringify(parsed)),
      LocalStorage.setItem(cacheTimestampKey, Date.now().toString()),
    ]);
  } catch (e) {
    console.warn("Failed to update playlist cache:", e);
    throw new Error("Failed to update playlist cache");
  }
}
