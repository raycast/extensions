import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getDeviceInfo, setEffect } from "./lib/nanoleaf-client";

export default async function Command() {
  try {
    const info = await getDeviceInfo();
    const list = info.effects.effectsList;
    if (list.length === 0) {
      throw new Error("No effects available on the device.");
    }
    const currentIndex = list.indexOf(info.effects.select);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % list.length;
    const next = list[nextIndex];
    await setEffect(next);
    await showHUD(`Effect: ${next}`);
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't switch effect" });
  }
}
