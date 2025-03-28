import { closeMainWindow, LocalStorage, showToast, Toast } from "@raycast/api";
import { Control } from "magic-home";
import Style = Toast.Style;

export default async function Command() {
  const device = await LocalStorage.getItem<string>("default-device");
  if (device) {
    await showToast({ title: "Doing some magic...", style: Style.Animated });
    const deviceControl = new Control(device);
    await deviceControl.setPower(false);
    await closeMainWindow();
  } else {
    await showToast({ title: "No default device set", style: Style.Failure });
  }
}
