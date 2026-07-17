import { closeMainWindow, showHUD } from "@raycast/api";
import { getDeviceUrl } from "./lib/discover";
import { volumeDown } from "./api/player";
import { cache } from "./lib/cache";
import { createLog } from "./lib/debug";

const log = createLog("volumeDown");

export default async () => {
  try {
    closeMainWindow();

    const playerUrl = await getDeviceUrl();

    const newVolume = await volumeDown(playerUrl);

    log.log(`Volume downed to ${newVolume}`);

    showHUD(`${cache.deviceName} volume was downed to ${newVolume}`);
  } catch (error) {
    log.error(`Failed to decrease volume: ${(<Error>error).message}`);
    showHUD("Failed to decrease volume");
  }
};
