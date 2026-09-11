import { closeMainWindow, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getDeviceUrl } from "./lib/discover";
import { getPlayerStatus, togglePlayPause } from "./api/player";
import { cache } from "./lib/cache";
import { createLog } from "./lib/debug";

const log = createLog("togglePlayPause");

export default async () => {
  try {
    closeMainWindow();

    const playerUrl = await getDeviceUrl();

    await togglePlayPause(playerUrl);

    const { isPlaying } = await getPlayerStatus(playerUrl);

    log.log(`Player is ${isPlaying ? "playing" : "paused"}`);

    showHUD(`${cache.deviceName} is ${isPlaying ? "playing" : "paused"}`);
  } catch (error) {
    log.error(`Failed to toggle play/pause: ${(<Error>error).message}`);
    await showFailureToast(error, { title: "Failed to toggle play/pause" });
  }
};
