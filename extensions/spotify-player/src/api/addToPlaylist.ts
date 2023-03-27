import { getSpotifyClient } from "../helpers/withSpotifyClient";

type AddToMyPlaylistProps = {
  playlistId: string;
  trackUris: string[];
};

export async function addToPlaylist({ playlistId, trackUris }: AddToMyPlaylistProps) {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.postPlaylistsByPlaylistIdTracks(playlistId, { uris: trackUris });
  return response;
}
