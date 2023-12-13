import { runAppleScript } from "@raycast/utils";
import { buildScriptEnsuringSpotifyIsRunning } from "../helpers/applescript";
import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";
import { getMyDevices } from "./getMyDevices";
import { checkSpotifyApp } from "../helpers/isSpotifyInstalled";

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
  const { devices } = await getMyDevices();

  try {
    if (!devices?.length || devices.length < 0) {
      throw new Error("No device found.");
    }

    // If there is an active device, use that. Otherwise, use the first device.
    const activeDevice = devices?.find((device) => device.is_active);
    const deviceId = activeDevice?.id ?? devices?.[0]?.id ?? undefined;

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
            offset: { uri: `${uriForType["track"]}${id}` },
          },
          {
            deviceId,
          },
        );
      } else {
        await spotifyClient.putMePlayerPlay(
          { uris: [`${uriForType["track"]}${id}`] },
          {
            deviceId,
          },
        );
      }
    } else if (type === "episode") {
      await spotifyClient.putMePlayerPlay(
        { uris: [`${uriForType["episode"]}${id}`] },
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
      error?.toLocaleLowerCase().includes("no device found") ||
      error?.toLocaleLowerCase().includes("no active device") ||
      error?.toLocaleLowerCase().includes("restricted device")
    ) {
      const isSpotifyInstalled = await checkSpotifyApp();
      if (!isSpotifyInstalled) {
        throw new Error("No active device found. Spotify is not installed.");
      }

      // If there is no active device, we need to open Spotify and play the track.
      try {
        if (!type || !id) {
          const script = buildScriptEnsuringSpotifyIsRunning("play");
          await runAppleScript(script);
        } else if (type === "track") {
          const script = buildScriptEnsuringSpotifyIsRunning(`play track "${uriForType[type]}${id}"`);
          await runAppleScript(script);
        } else {
          // For albums/artists/etc we seem to need a delay. Trying 1 second.
          const script = buildScriptEnsuringSpotifyIsRunning(`
            delay 1
            play track "${uriForType[type]}${id}"`);
          await runAppleScript(script);
        }
        return;
      } catch (error) {
        const message = getErrorMessage(error);
        throw new Error(message);
      }
    }

    throw new Error(error);
  }
}
