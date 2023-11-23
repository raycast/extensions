import { buildScriptEnsuringSpotifyIsRunning, runAppleScriptSilently } from "../helpers/applescript";
import { getErrorMessage } from "../helpers/getError";
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
        if (error?.toLocaleLowerCase().includes("no active device")) {
          const script = buildScriptEnsuringSpotifyIsRunning(`tell application "Spotify"
          launch
          delay 3
          play track "${tracks[0].uri}"
  end tell`);
          await runAppleScriptSilently(script);
        }
      }
    }
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("startRadio.ts Error:", error);
    throw new Error(error);
  }
}
