import { getSpotifyClient } from "../helpers/withSpotifyClient";

type AddToQueueProps = {
  uri: string;
};

export async function addToQueue({ uri }: AddToQueueProps) {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.postMePlayerQueue(uri);
  return response;
}
