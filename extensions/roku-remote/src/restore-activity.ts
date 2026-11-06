import { showHUD, showToast, Toast } from "@raycast/api";
import { getSelectedDevice } from "./lib/storage";
import { restorePrevious } from "./lib/automation";
import { describeRokuError } from "./lib/roku";

export default async function Command() {
  try {
    const device = await getSelectedDevice();
    if (!device) throw new Error("Choose a default TV in Manage Roku TVs first.");
    const result = await restorePrevious(device);
    await showHUD(`${device.name}: ${result.message}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't restore previous activity",
      message: describeRokuError(error),
    });
  }
}
