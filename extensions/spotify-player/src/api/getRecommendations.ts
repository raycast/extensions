import { getSpotifyClient } from "../helpers/withSpotifyClient";

type GetRecommendatons = {
  trackIds: string[];
  artistIds?: string[];
};

export async function getRecommendations({ trackIds, artistIds }: GetRecommendatons) {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.getRecommendations({
    seedTracks: trackIds.join(),
    seedArtists: artistIds?.join(),
  });
  return response;
}
