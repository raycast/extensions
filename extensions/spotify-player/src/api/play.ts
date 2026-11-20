import { HttpError } from "oazapfts";
import { invalidateCache } from "../helpers/apiCache";
import { getErrorMessage } from "../helpers/getError";
import { checkSpotifyApp } from "../helpers/isSpotifyInstalled";
import { runSpotifyScript, SpotifyScriptType } from "../helpers/script";
import { getSpotifyClient } from "../helpers/withSpotifyClient";
import { getMyDevices } from "./getMyDevices";
import { transfersSettled } from "./transferMyPlayback";
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
  // After the moves to another device asked for so far, so it plays where they leave playback.
  await transfersSettled();
  const { spotifyClient } = getSpotifyClient();
  let isSpotifyInstalled = false;

  try {
    // Usually a device is already active, and Spotify plays on it when the request names no device. Try that first, so
    // Play doesn't wait for the device and app lookups below. They're only needed when no device can play.
    try {
      await startPlayback({ id, type, contextUri, uris });
      return;
    } catch (err) {
      if (!needsAnotherDevice(getErrorMessage(err))) throw err;
    }

    // Spotify couldn't play on the active device, so a cached list showing which device is active may be out of date.
    invalidateCache("api:devices");
    const { devices } = await getMyDevices();
    isSpotifyInstalled = await checkSpotifyApp();

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
        return await launchSpotifyAndPlay({ id, type });
      }
    }

    const deviceId = activeDevice?.id ?? devices?.[0]?.id ?? undefined;

    await startPlayback({ id, type, contextUri, uris }, deviceId);
  } catch (err) {
    const error = getErrorMessage(err);

    if (isSpotifyInstalled && needsAnotherDevice(error)) {
      // Open the Spotify app and play the track there instead.
      await launchSpotifyAndPlay({ id, type });
      return;
    }

    throw new Error(error);
  } finally {
    invalidateCache("api:currently-playing");
  }
}

// Without a device ID, Spotify plays on the active device.
async function startPlayback({ id, type, contextUri, uris }: PlayProps, deviceId?: string) {
  const { spotifyClient } = getSpotifyClient();

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
}

// Spotify can't play on the active device, or there isn't one, so play() has to pick a device or open the Spotify app.
function needsAnotherDevice(error: string) {
  const message = error.toLowerCase();
  return ["no device found", "no active device", "restricted device", "premium required"].some((text) =>
    message.includes(text),
  );
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
