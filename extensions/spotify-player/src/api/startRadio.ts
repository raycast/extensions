import { buildScriptEnsuringSpotifyIsRunning, runAppleScriptSilently } from "../helpers/applescript";
import { getSpotifyClient } from "../helpers/withSpotifyClient";
import { getRecommendations } from "./getRecommendations";

type StartRadioProps = {
  trackIds?: string[];
  artistIds?: string[];
};

export async function startRadio({ trackIds = [], artistIds = [] }: StartRadioProps = {}) {
  const { spotifyClient } = getSpotifyClient();

  const recommendationsResponse = await getRecommendations({ trackIds, artistIds });
  const tracks = recommendationsResponse.tracks;
  if (tracks) {
    try {
      await spotifyClient.play({ uris: tracks.flatMap((track) => track.uri) });
    } catch (error: any) {
      if (error.message.includes("NO_ACTIVE_DEVICE")) {
        const script = buildScriptEnsuringSpotifyIsRunning(`tell application "Spotify"
          launch
          delay 3
          play track "${tracks[0].uri}"
  end tell`);
        await runAppleScriptSilently(script);
      }
    }
  }
}
