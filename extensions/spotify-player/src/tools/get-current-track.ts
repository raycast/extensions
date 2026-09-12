import { getCurrentlyPlaying } from "../api/getCurrentlyPlaying";
import { getMe } from "../api/getMe";
import { withSpotifyClient } from "../helpers/withSpotifyClient";

const tool = async () => {
  const me = await getMe();

  if (me.product !== "premium") {
    throw new Error(
      "Getting the currently playing track requires a Spotify Premium subscription. See https://www.spotify.com/us/premium/",
    );
  }

  const response = await getCurrentlyPlaying();

  return {
    id: response?.item.id,
    name: response?.item.name,
    href: response?.item.href,
    isPlaying: response?.is_playing,
  };
};

export default withSpotifyClient(tool);
