import { addToPlaylist } from "../api/addToPlaylist";
import { withSpotifyClient } from "../helpers/withSpotifyClient";

type Input = {
  /**
   * The ID of the track to add to the playlist
   */
  trackId: string;
  /**
   * The ID of the playlist to add the track to
   */
  playlistId: string;
};

const tool = async ({ trackId, playlistId }: Input) => {
  await addToPlaylist({ playlistId: playlistId, trackUris: [`spotify:track:${trackId}`] });
};

export default withSpotifyClient(tool);
