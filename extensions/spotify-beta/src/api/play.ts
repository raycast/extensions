import { runAppleScript } from "run-applescript";
import { buildScriptEnsuringSpotifyIsRunning } from "../helpers/applescript";
import { getErrorMessage } from "../helpers/getError";
import { checkSpotifyApp } from "../helpers/isSpotifyInstalled";
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

  async function checkIfSpotifyIsRunning() {
    const response = await runAppleScript(`
    if application "Spotify" is running then
        return "Spotify is running"
      else
        return "Spotify is not running"
      end if
    `);
    return response === "Spotify is running";
  }

  async function tryWithAppleScript() {
    let script = "";
    if (!type || !id) {
      script = buildScriptEnsuringSpotifyIsRunning("play");
    } else {
      script = buildScriptEnsuringSpotifyIsRunning(`delay 3
      play track "${uriForType[type]}${id}"`);
    }

    await runAppleScript(script);
    return;
  }

  const isSpotifyInstalled = await checkSpotifyApp();
  const isSpotifyRunning = await checkIfSpotifyIsRunning();

  if (isSpotifyInstalled && isSpotifyRunning) {
    tryWithAppleScript();
  } else {
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

      if (error?.toLocaleLowerCase().includes("no active device")) {
        tryWithAppleScript();
      }

      console.log("play.ts Error: ", error);
      throw new Error(error);
    }
  }
}
