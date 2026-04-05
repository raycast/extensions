import { showHUD, showToast, Toast } from "@raycast/api";
import { toggleBluetooth } from "./bluetooth";

export default async function ToggleBluetooth() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Toggling Bluetooth…",
  });

  const result = await toggleBluetooth();
  if (result.success && result.data) {
    const { bluetoothEnabled, adapterName } = result.data;
    toast.hide();
    await showHUD(
      bluetoothEnabled
        ? `Bluetooth On – ${adapterName}`
        : `Bluetooth Off – ${adapterName}`,
    );
  } else {
    toast.style = Toast.Style.Failure;
    toast.title = "Toggle failed";
    toast.message = result.error ?? "Unknown error";
  }
}
