import { Cache } from "@raycast/api";
import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

const cache = new Cache();

type ContainsMySavedTracksProps = {
  trackIds: string[];
};

async function _containsMySavedTracks({ trackIds }: ContainsMySavedTracksProps) {
  const { spotifyClient } = getSpotifyClient();

  try {
    const response = await spotifyClient.getMeTracksContains(trackIds.join());
    return response;
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("containsMySavedTracks.ts Error:", error);
    throw new Error(error);
  }
}

export async function containsMySavedTracks({ trackIds }: ContainsMySavedTracksProps) {
  const key = `api:liked:${trackIds.join(",")}`;
  const raw = cache.get(key);
  if (raw) {
    try {
      const entry = JSON.parse(raw);
      if (Date.now() - entry.timestamp < 30000) return entry.data;
    } catch {
      /* proceed */
    }
  }
  const data = await _containsMySavedTracks({ trackIds });
  cache.set(key, JSON.stringify({ data, timestamp: Date.now() }));
  return data;
}
