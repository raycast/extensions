import { buildScriptEnsuringSpotifyIsRunning, runAppleScriptSilently } from "../helpers/applescript";
import { getError } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

type ContextTypes = "album" | "artist" | "playlist" | "track" | "show" | "episode";

type PlayProps = {
  id?: string | undefined;
  type?: ContextTypes | undefined;
};

const uriForType: Record<ContextTypes, string> = {
  album: "spotify:album:",
  artist: "spotify:artist:",
  playlist: "spotify:playlist:",
  track: "spotify:track:",
  show: "spotify:show:",
  episode: "spotify:episode:",
};

export async function play({ id, type }: PlayProps = {}) {
  const { spotifyClient } = getSpotifyClient();

  try {
    if (!type || !id) {
      await spotifyClient.putMePlayerPlay();
    } else if (type === "track") {
      await spotifyClient.putMePlayerPlay({ uris: [`${uriForType["track"]}${id}`] });
    } else if (type === "episode") {
      await spotifyClient.putMePlayerPlay({ uris: [`${uriForType["episode"]}${id}`] });
    } else {
      await spotifyClient.putMePlayerPlay({ context_uri: `${uriForType[type]}${id}` });
    }
  } catch (err) {
    const error = getError(err);

    if (error.reason.includes("NO_ACTIVE_DEVICE")) {
      if (!type || !id) {
        const script = buildScriptEnsuringSpotifyIsRunning("play");
        await runAppleScriptSilently(script);
        return;
      }

      const script = buildScriptEnsuringSpotifyIsRunning(`tell application "Spotify"
        launch
        delay 3
        play track "${uriForType[type]}${id}"
end tell`);
      await runAppleScriptSilently(script);
      return;
    }

    console.log("play error", error);
  }
}
