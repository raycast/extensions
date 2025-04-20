import { withSpotifyClient } from "../helpers/withSpotifyClient";
import { getQueue } from "../api/getQueue";
import { addToQueue } from "../api/addTrackToQueue";

/*
 * Grant AI the ability to access your music queue.
 * This allows the AI to add new songs to the queue or review the existing queue as necessary.
 */

type Input = {
  /**
   * The ID of the track to add to the queue
   * ID's look like this '3TVXtAsR1Inumwj472S9r4'.
   */
  trackId?: string;
};

const tool = async ({ trackId }: Input) => {
  try {
    // Add track to queue if trackId is provided
    let response = null;
    if (trackId) {
      response = await addToQueue({ uri: `spotify:track:${trackId}` });
    } else {
      response = await getQueue();
    }

    // Get current queue

    return {
      queue: response || [],
      status: "success",
      message: trackId ? "Track added to queue successfully" : "Current queue retrieved",
    };
  } catch (error) {
    return {
      queue: [],
      status: "error",
      message: `Queue operation failed: ${error}`,
    };
  }
};

export default withSpotifyClient(tool);
