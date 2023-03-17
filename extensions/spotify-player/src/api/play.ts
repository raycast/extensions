import { buildScriptEnsuringSpotifyIsRunning, runAppleScriptSilently } from "../helpers/applescript";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

type ContextTypes = 'album' | 'artist' | 'playlist' | 'track'

type PlayProps = {
  id?: string | undefined;
  type?: ContextTypes | undefined;
};

const uriForType: Record<ContextTypes, string> = {
  'album': "spotify:album:",
  'artist': "spotify:artist:",
  'playlist': "spotify:playlist:",
  'track': "spotify:track:",
}

export async function play({ id, type }: PlayProps = {}) {
  const { spotifyClient } = getSpotifyClient();

  try {
    if (!type || !id) {
      await spotifyClient.play();
    } else if (type === 'track') {
      await spotifyClient.play({ uris: [`${uriForType['track']}${id}`] });
    } else {
      await spotifyClient.play({ context_uri: `${uriForType[type]}${id}` });
    }
  } catch (error: any) {
    if (error.message.includes("NO_ACTIVE_DEVICE")) {
      if (!type || !id) {
        const script = buildScriptEnsuringSpotifyIsRunning('play');
        await runAppleScriptSilently(script);
        return;
      }

      const script = buildScriptEnsuringSpotifyIsRunning(`tell application "Spotify"
        launch
        delay 3
        play track "${uriForType[type]}${id}"
end tell`);
      await runAppleScriptSilently(script);
    }
  }
}
