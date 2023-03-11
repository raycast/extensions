import { getSpotifyClient } from "../helpers/withSpotifyClient";
import { getRecommendations } from "./getRecommendations";

type StartRadioProps = {
  trackIds?: string[];
  artistIds?: string[];
};

export async function startRadio({ trackIds = [], artistIds = [] }: StartRadioProps) {
  const { spotifyClient } = getSpotifyClient();
  const recommendationsResponse = await getRecommendations({ trackIds, artistIds });
  const tracks = recommendationsResponse.tracks.flatMap((track) => track.uri);
  if (tracks) {
    await spotifyClient.play({ uris: tracks });
  }
}
