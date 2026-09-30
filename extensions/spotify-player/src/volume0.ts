import { changeVolumeWithHUD } from "./api/changeVolume";
import { setSpotifyClient } from "./helpers/withSpotifyClient";

export default async function Command() {
  await setSpotifyClient();
  await changeVolumeWithHUD(0);
}
