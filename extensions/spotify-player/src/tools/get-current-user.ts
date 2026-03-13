import { getMe } from "../api/getMe";
import { withSpotifyClient } from "../helpers/withSpotifyClient";

const tool = async () => {
  const me = await getMe();
  return {
    id: me.id,
    displayName: me.display_name,
    email: me.email,
    product: me.product,
  };
};

export default withSpotifyClient(tool);
