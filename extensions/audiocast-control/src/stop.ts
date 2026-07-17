import { closeMainWindow, showHUD } from "@raycast/api";
import { getDeviceUrl } from "./lib/discover";
import { stop } from "./api/player";
import { cache } from "./lib/cache";
import { createLog } from "./lib/debug";

const log = createLog("stop");

export default async () => {
  try {
    closeMainWindow();

    const playerUrl = await getDeviceUrl();

    await stop(playerUrl);

    log.log("Player is stopped");

    showHUD(`${cache.deviceName} is stopped`);
  } catch (error) {
    log.error(`Failed to stop: ${(<Error>error).message}`);
    showHUD("Failed to stop");
  }
};
