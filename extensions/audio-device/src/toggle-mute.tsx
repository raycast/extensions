import { showHUD, showToast, Toast } from "@raycast/api";
import { getDefaultOutputDevice, getOutputDeviceVolume, toggleOutputDeviceMute } from "./audio-device";

export default async function Command() {
  try {
    const device = await getDefaultOutputDevice();
    const [isMuted, volume] = await Promise.all([toggleOutputDeviceMute(device.id), getOutputDeviceVolume(device.id)]);

    const pct = volume != null ? Math.round(volume * 100) : "?";
    if (isMuted) {
      await showHUD(`Muted ${device.name}`);
    } else {
      await showHUD(`Unmuted ${device.name} (${pct}%)`);
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Toggle Mute",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
