import { getErrorMessage } from "../helpers/getError";
import { EpisodeObject, TrackObject } from "../helpers/spotify.api";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function seek(position: number): Promise<"next" | "position" | "error"> {
  const { spotifyClient } = getSpotifyClient();

  try {
    // fetching the currently playing is only for the return value.
    const response = await spotifyClient.getMePlayerCurrentlyPlaying({ additionalTypes: "episode" });
    if (response) {
      const item = response.item as unknown as EpisodeObject | TrackObject;
      if (item.duration_ms && position * 1000 > item.duration_ms) {
        await spotifyClient.postMePlayerNext();
        return "next";
      } else {
        // seek in seconds as there is no reason to seek in milliseconds, so multiply by 1000
        // Seek actually will skip to next track, but better to be more verbose here.
        await spotifyClient.putMePlayerSeek(position * 1000);
        return "position";
      }
    }
    return "error";
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("seek.ts Error:", error);
    throw new Error(error);
  }
}
