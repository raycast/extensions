import { getSpotifyClient } from "../helpers/withSpotifyClient";

type GetShowEpisodesProps = {
  showId: string;
  limit: number;
};

export async function getShowEpisodes({ showId, limit }: GetShowEpisodesProps) {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.getShowsByIdEpisodes(showId, { limit });
  return response;
}
