import { closeMainWindow, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getDeviceUrl } from "./lib/discover";
import { toggleMute } from "./api/player";
import { cache } from "./lib/cache";
import { createLog } from "./lib/debug";

const log = createLog("toggleMute");

export default async () => {
  try {
    closeMainWindow();

    const playerUrl = await getDeviceUrl();

    const isMuted = await toggleMute(playerUrl);

    const muteStatus = `${!isMuted ? "un" : ""}mute`;

    log.log(`Player is ${muteStatus}`);

    showHUD(`${cache.deviceName} is ${muteStatus}`);
  } catch (error) {
    log.error(`Failed to toggle mute: ${(<Error>error).message}`);
    await showFailureToast(error, { title: "Failed to toggle mute" });
  }
};
