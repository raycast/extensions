import { buildScriptEnsuringSpotifyIsRunning, runAppleScriptSilently } from "../helpers/applescript";
import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

type ContextTypes = "album" | "artist" | "playlist" | "track" | "show" | "episode";

type PlayProps = {
  id?: string | undefined;
  type?: ContextTypes | undefined;
  contextUri?: string;
};

const uriForType: Record<ContextTypes, string> = {
  album: "spotify:album:",
  artist: "spotify:artist:",
  playlist: "spotify:playlist:",
  track: "spotify:track:",
  show: "spotify:show:",
  episode: "spotify:episode:",
};

export async function play({ id, type, contextUri }: PlayProps = {}) {
  const { spotifyClient } = getSpotifyClient();

  try {
    if (!type || !id) {
      await spotifyClient.putMePlayerPlay();
    } else if (type === "track") {
      if (contextUri) {
        await spotifyClient.putMePlayerPlay({
          context_uri: contextUri,
          offset: { uri: `${uriForType["track"]}${id}` },
        });
      } else {
        await spotifyClient.putMePlayerPlay({ uris: [`${uriForType["track"]}${id}`] });
      }
    } else if (type === "episode") {
      await spotifyClient.putMePlayerPlay({ uris: [`${uriForType["episode"]}${id}`] });
    } else {
      await spotifyClient.putMePlayerPlay({ context_uri: `${uriForType[type]}${id}` });
    }
  } catch (err) {
    const error = getErrorMessage(err);

    if (
      error?.toLocaleLowerCase().includes("no active device") ||
      error?.toLocaleLowerCase().includes("restricted device")
    ) {
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

    console.log("play.ts Error: ", error);
    throw new Error(error);
  }
}
