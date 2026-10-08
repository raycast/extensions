import { addToPlaylist } from "../api/addToPlaylist";
import { createPlaylist } from "../api/createPlaylist";
import { withSpotifyClient } from "../helpers/withSpotifyClient";

type Input = {
  /**
   * The name of the playlist
   */
  name: string;
  /**
   * The description of the playlist
   */
  description?: string;
  /**
   * The track IDs to add to the playlist. Always use this argument to add tracks to new playlist insteed of adding tracks separately.
   */
  trackIDs?: string[];
};

const tool = async ({ name, description, trackIDs }: Input) => {
  const playlist = await createPlaylist({ name, description: description ?? "" });
  if (!playlist || !playlist.id) {
    throw new Error("Failed to create playlist");
  }

  if (trackIDs) {
    const trackUris = trackIDs.map((id) => `spotify:track:${id}`);
    await addToPlaylist({ playlistId: playlist.id, trackUris });
  }

  return {
    id: playlist.id,
    name: playlist.name,
    description: playlist.description,
    url: playlist.external_urls?.spotify,
    owner: {
      id: playlist.owner?.id,
    },
  };
};

export default withSpotifyClient(tool);
