import { buildScriptEnsuringSpotifyIsRunning, runAppleScriptSilently } from "../helpers/applescript";
import { getSpotifyClient } from "../helpers/withSpotifyClient";
import { getArtistTopTracks } from "./getArtistTopTracks";
import { getPlaylistTracks } from "./getPlaylistTracks";

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

      let trackUri = "";

      if (type === 'track') {
        trackUri = `${uriForType['track']}${id}`;

      } else if (type === 'artist') {
        // const tracks = await getArtistTopTracks(id);
        // trackUri = tracks.tracks[0].uri
        trackUri = `${uriForType['artist']}${id}`
      } else if (type === 'playlist') {
        const tracks = await getPlaylistTracks(id)
        // trackUri = tracks.items[0].track?.uri || ""
        // console.log(trackUri, `${uriForType['playlist']}${id}`)
        // const script = buildScriptEnsuringSpotifyIsRunning(`tell application "Spotify" to play track "${trackUri}" in context "${uriForType['playlist']}${id}"`);
        // await runAppleScriptSilently(script);
        // return
        trackUri = `${uriForType['playlist']}${id}`
        console.log(trackUri)

      }
      const script = buildScriptEnsuringSpotifyIsRunning(`tell application "Spotify"
        launch
        delay 3
        play track "${trackUri}"
end tell`);
      await runAppleScriptSilently(script);
    }

    // console.error(error);
  }
}
