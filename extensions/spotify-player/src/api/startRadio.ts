import { getErrorMessage } from "../helpers/getError";
import { runSpotifyScript, SpotifyScriptType } from "../helpers/script";
import { getSpotifyClient } from "../helpers/withSpotifyClient";
import { getRecommendations } from "./getRecommendations";

type StartRadioProps = {
  trackIds?: string[];
  artistIds?: string[];
};

export async function startRadio({ trackIds = [], artistIds = [] }: StartRadioProps = {}) {
  const { spotifyClient } = getSpotifyClient();

  try {
    const recommendationsResponse = await getRecommendations({ trackIds, artistIds });
    const tracks = recommendationsResponse?.tracks;

    if (tracks) {
      try {
        await spotifyClient.putMePlayerPlay({ uris: tracks.flatMap((track) => track.uri as string) });
      } catch (err) {
        const error = getErrorMessage(err);
        if (
          error?.toLocaleLowerCase().includes("no active device") ||
          error?.toLocaleLowerCase().includes("restricted device") ||
          error?.toLocaleLowerCase().includes("premium required")
        ) {
          await runSpotifyScript(SpotifyScriptType.PlayTrack, true, tracks[0].uri as string);
        }
      }
    }
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("startRadio.ts Error:", error);
    throw new Error(error);
  }
}
