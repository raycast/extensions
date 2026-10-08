import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

type AddToQueueProps = {
  uri: string;
};

export async function addToQueue({ uri }: AddToQueueProps) {
  const { spotifyClient } = getSpotifyClient();

  try {
    const response = await spotifyClient.postMePlayerQueue(uri);
    return response;
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("addToQueue.ts Error:", error);
    throw new Error(error);
  }
}
