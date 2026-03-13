import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";
import { TrackObject, EpisodeObject } from "../helpers/spotify.api";

export async function getQueue() {
  const { spotifyClient } = getSpotifyClient();
  try {
    const response = await spotifyClient.getMePlayerQueue();
    return response.queue as undefined | (TrackObject | EpisodeObject)[];
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getQueue.ts Error:", error);
    throw new Error(error);
  }
}
