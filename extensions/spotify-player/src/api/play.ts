import { HttpError } from "oazapfts";
import { getErrorMessage } from "../helpers/getError";
import { checkSpotifyApp } from "../helpers/isSpotifyInstalled";
import { runSpotifyScript, SpotifyScriptType } from "../helpers/script";
import { getSpotifyClient } from "../helpers/withSpotifyClient";
import { getMyDevices } from "./getMyDevices";
import retry from "async-retry";

type ContextTypes = "album" | "artist" | "playlist" | "track" | "show" | "episode";

type PlayProps = {
  id?: string | undefined;
  type?: ContextTypes | undefined;
  contextUri?: string;
  uris?: string[];
};

const uriForType: Record<ContextTypes, string> = {
  album: "spotify:album:",
  artist: "spotify:artist:",
  playlist: "spotify:playlist:",
  track: "spotify:track:",
  show: "spotify:show:",
  episode: "spotify:episode:",
};

export async function play({ id, type, contextUri, uris }: PlayProps = {}) {
  const { spotifyClient } = getSpotifyClient();
  const { devices } = await getMyDevices();
  const isSpotifyInstalled = await checkSpotifyApp();

  try {
    // If there is an active device, we can just play the track.
    // If there is no active device, we need to open Spotify and play the track.
    // If there is no active device and Spotify is not installed, we need to throw an error.
    const activeDevice = devices?.find((device) => device.is_active);

    if (!activeDevice && isSpotifyInstalled) {
      // For uris array, launch Spotify and play those tracks using Web API
      if (uris && uris.length > 0) {
        // We can start spotify by starting script pause
        await runSpotifyScript(SpotifyScriptType.Pause, false);

        // Retry logic to handle cases where Spotify is not open yet.
        // Use bail to immediately fail on permanent errors (auth, premium, etc.)
        await retry(
          async (bail) => {
            try {
              console.warn("Trying to play via Web API.");
              // Check for devices - Spotify may not be fully launched yet
              const { devices } = await getMyDevices();
              const activeDevice = devices?.find((device) => device.is_active);
              const deviceId = activeDevice?.id ?? devices?.[0]?.id ?? undefined;

              // Start playback using Web API
              // If Spotify is not fully launched yet, this may throw an error,
              // so we catch it and retry (unless it's a permanent error)
              await spotifyClient.putMePlayerPlay(
                { uris },
                {
                  deviceId,
                },
              );
            } catch (err) {
              if (err instanceof HttpError) {
                const errorData = JSON.parse(err.data);
                const errorMessage = errorData?.error?.message;
                if (errorMessage) {
                  if (errorMessage.toLowerCase().includes("no active device")) {
                    // Transient error - Spotify may not be ready yet, so we retry
                    throw err;
                  }
                }
              }
              // If this is a permanent error, bail immediately (don't retry)
              return bail(err);
            }
          },
          { retries: 5, minTimeout: 1000 },
        );
        // Successfully started playback via Web API after launching Spotify.
        return;
      } else {
        return launchSpotifyAndPlay({ id, type });
      }
    }

    const deviceId = activeDevice?.id ?? devices?.[0]?.id ?? undefined;

    // If uris array is provided, play those tracks directly (replaces current playback/queue)
    if (uris && uris.length > 0) {
      await spotifyClient.putMePlayerPlay(
        { uris },
        {
          deviceId,
        },
      );
      return;
    }

    if (!type || !id) {
      await spotifyClient.putMePlayerPlay(
        { context_uri: contextUri },
        {
          deviceId,
        },
      );
    } else if (type === "track") {
      if (contextUri) {
        await spotifyClient.putMePlayerPlay(
          {
            context_uri: contextUri,
            offset: { uri: `${uriForType.track}${id}` },
          },
          {
            deviceId,
          },
        );
      } else {
        await spotifyClient.putMePlayerPlay(
          { uris: [`${uriForType.track}${id}`] },
          {
            deviceId,
          },
        );
      }
    } else if (type === "episode") {
      await spotifyClient.putMePlayerPlay(
        { uris: [`${uriForType.episode}${id}`] },
        {
          deviceId,
        },
      );
    } else {
      await spotifyClient.putMePlayerPlay(
        { context_uri: `${uriForType[type]}${id}` },
        {
          deviceId,
        },
      );
    }
  } catch (err) {
    const error = getErrorMessage(err);

    if (
      isSpotifyInstalled &&
      (error?.toLocaleLowerCase().includes("no device found") ||
        error?.toLocaleLowerCase().includes("no active device") ||
        error?.toLocaleLowerCase().includes("restricted device") ||
        error?.toLocaleLowerCase().includes("premium required"))
    ) {
      // If one of the above errors is thrown, we need to open Spotify and play the track.
      await launchSpotifyAndPlay({ id, type });
      return;
    }

    throw new Error(error);
  }
}

async function launchSpotifyAndPlay({ id, type }: { id?: string; type?: ContextTypes }) {
  try {
    if (!type || !id) {
      await runSpotifyScript(SpotifyScriptType.Play);
    } else if (type === "track") {
      await runSpotifyScript(SpotifyScriptType.PlayTrack, false, `${uriForType[type]}${id}`);
    } else {
      // For albums/artists/etc we seem to need a delay. Trying 1 second.
      await runSpotifyScript(SpotifyScriptType.PlayTrack, false, `${uriForType[type]}${id}`, 1);
    }
  } catch (error) {
    const message = getErrorMessage(error);
    throw new Error(message);
  }
}
