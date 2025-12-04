import { closeMainWindow, LocalStorage, showToast, Toast } from "@raycast/api";
import { Control } from "magic-home";
import Style = Toast.Style;
import { showFailureToast } from "@raycast/utils";

export default async function PowerHandler(power: boolean) {
  const device = await LocalStorage.getItem<string>("default-device");
  if (device) {
    try {
      await showToast({ title: "Doing some magic...", style: Style.Animated });
      const deviceControl = new Control(device);
      await deviceControl.setPower(power);
      await closeMainWindow();
    } catch (error) {
      await showFailureToast(error, { title: `Failed to power ${power ? "on" : "off"} device` });
    }
  } else {
    await showToast({ title: "No default device set", style: Style.Failure });
  }
}
