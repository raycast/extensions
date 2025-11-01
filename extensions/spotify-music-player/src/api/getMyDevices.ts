import { showToast, Toast } from "@raycast/api";
import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function getMyDevices() {
  const { spotifyClient } = getSpotifyClient();

  try {
    const response = await spotifyClient.getMePlayerDevices();
    return response;
  } catch (err) {
    const error = getErrorMessage(err);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to get devices",
      message: error,
    });
    throw new Error(error);
  }
}
