import { getErrorMessage } from "../helpers/getError";
import { runSpotifyScript, SpotifyScriptType } from "../helpers/script";
import { EpisodeObject, TrackObject } from "../helpers/spotify.api";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

/**
 * Seek to a position (in seconds) in the current track.
 * Pass `durationMs` to avoid an extra API call to check track duration.
 */
export async function seek(position: number, durationMs?: number): Promise<"next" | "position" | "error"> {
  const { spotifyClient } = getSpotifyClient();
  let playNext = false;

  try {
    // If caller provided duration, use it directly instead of fetching currently playing
    let trackDurationMs = durationMs;
    if (trackDurationMs === undefined) {
      const response = await spotifyClient.getMePlayerCurrentlyPlaying({ additionalTypes: "episode" });
      if (!response) return "error";
      const item = response.item as unknown as EpisodeObject | TrackObject;
      trackDurationMs = item.duration_ms;
    }

    if (trackDurationMs && position * 1000 > trackDurationMs) {
      playNext = true;
      await spotifyClient.postMePlayerNext();
      return "next";
    } else {
      await spotifyClient.putMePlayerSeek(position * 1000);
      return "position";
    }
  } catch (err) {
    const error = getErrorMessage(err);

    if (
      error?.toLocaleLowerCase().includes("restricted device") ||
      error?.toLocaleLowerCase().includes("premium required")
    ) {
      if (playNext) {
        await runSpotifyScript(SpotifyScriptType.NextTrack);
        return "next";
      } else {
        await runSpotifyScript(SpotifyScriptType.SetPosition, false, position);
        return "position";
      }
    }

    console.log("seek.ts Error:", error);
    throw new Error(error);
  }
}
