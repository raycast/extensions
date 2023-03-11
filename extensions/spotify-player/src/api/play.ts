import { getSpotifyClient } from "../helpers/withSpotifyClient";

type PlayProps = {
  uri?: string;
  contextUri?: string;
};

export async function play({ uri, contextUri }: PlayProps = {}) {
  const { spotifyClient } = getSpotifyClient();
  await spotifyClient.play({ uris: uri ? [uri] : undefined, context_uri: contextUri });
}
