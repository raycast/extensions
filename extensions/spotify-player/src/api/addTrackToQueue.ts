import { getSpotifyClient } from "../helpers/withSpotifyClient";

type AddToQueueProps = {
  trackUri: string;
};

export async function addToQueue({ trackUri }: AddToQueueProps) {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.postMePlayerQueue(trackUri);
  return response;
}
