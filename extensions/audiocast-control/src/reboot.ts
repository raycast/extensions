import { closeMainWindow, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getDeviceUrl } from "./lib/discover";
import { reboot } from "./api/player";
import { cache } from "./lib/cache";
import { createLog } from "./lib/debug";

const log = createLog("reboot");

export default async () => {
  try {
    closeMainWindow();

    const playerUrl = await getDeviceUrl();

    await reboot(playerUrl);

    log.log("Device rebooted");

    showHUD(`${cache.deviceName} rebooted`);
  } catch (error) {
    log.error(`Failed to reboot device: ${(<Error>error).message}`);
    await showFailureToast(error, { title: "Failed to reboot device" });
  }
};
