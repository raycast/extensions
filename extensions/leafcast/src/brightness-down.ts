import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getDeviceInfo, setBrightness } from "./lib/nanoleaf-client";

const STEP = 10;

export default async function Command() {
  try {
    const info = await getDeviceInfo();
    const next = Math.max(info.state.brightness.value - STEP, 0);
    await setBrightness(next);
    await showHUD(`Brightness: ${next}%`);
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't change brightness" });
  }
}
