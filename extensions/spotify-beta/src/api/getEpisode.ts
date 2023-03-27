import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function getEpisode(episodeId: string) {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.getEpisodesById(episodeId);
  return response;
}
