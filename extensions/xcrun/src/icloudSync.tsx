import { Devices } from "./bootedDevices";
import { icloudSync } from "./util";
import { Device } from "./types";
import { Toast, showToast } from "@raycast/api";
import { showExecutedToast } from "./toasts";

export default function Command() {
  async function deviceChoosen(device: Device) {
    try {
      await icloudSync(device.udid);
      await showExecutedToast();
    } catch (error: any) {
      await showToast({ title: `Error: ${error}`, style: Toast.Style.Failure });
    }
  }
  return <Devices onDeviceChoose={deviceChoosen} />;
}
