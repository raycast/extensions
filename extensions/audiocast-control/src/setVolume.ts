import { closeMainWindow, type LaunchProps, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getDeviceUrl } from "./lib/discover";
import { setVolume } from "./api/player";
import { cache } from "./lib/cache";
import { createLog } from "./lib/debug";

const log = createLog("setVolume");

export default async (props: LaunchProps<{ arguments: Arguments.SetVolume }>) => {
  try {
    closeMainWindow();

    const newVolume = parseInt(props.arguments.volume, 10);

    if (isNaN(newVolume) || newVolume < 0 || newVolume > 100) {
      throw new Error("Volume must be a number between 0 and 100");
    }

    const playerUrl = await getDeviceUrl();

    await setVolume(playerUrl, newVolume);

    log.log(`Volume set to ${newVolume}`);

    showHUD(`${cache.deviceName} volume was set to ${newVolume}`);
  } catch (error) {
    log.error(`Failed to set volume: ${(<Error>error).message}`);
    await showFailureToast(error, { title: "Failed to set volume" });
  }
};
