import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getDeviceInfo, setPower } from "./lib/nanoleaf-client";

export default async function Command() {
  try {
    const info = await getDeviceInfo();
    const next = !info.state.on.value;
    await setPower(next);
    await showHUD(next ? "Lights turned on" : "Lights turned off");
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't toggle power" });
  }
}
