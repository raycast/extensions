import { getPreferenceValues, showHUD } from "@raycast/api";
import { connectDevice, discoverDevices } from "./lib/swift-bridge";
import { getFavoriteDeviceName, markConnected } from "./lib/display-store";
import { SidecarDevice } from "./lib/types";

export default async function QuickConnect() {
  const preferences = getPreferenceValues<{ defaultDevice?: string }>();

  // Determine target: preference > favorite > first available
  let targetName = preferences.defaultDevice?.trim();

  if (!targetName) {
    targetName = await getFavoriteDeviceName();
  }

  if (!targetName) {
    let devices: SidecarDevice[];

    try {
      devices = (await discoverDevices()) as SidecarDevice[];
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await showHUD(`Failed to discover devices: ${message}`);
      return;
    }

    if (devices.length === 0) {
      await showHUD("No Sidecar devices found");
      return;
    }

    const available = devices.find((d) => !d.isConnected);
    if (available) {
      targetName = available.name;
    } else if (devices.length === 1 && devices[0].isConnected) {
      await showHUD(`Already connected to ${devices[0].name}`);
      return;
    } else {
      await showHUD("All discovered Sidecar devices are already connected");
      return;
    }
  }

  if (!targetName) {
    await showHUD("No device configured — set a default in extension preferences or mark a favorite");
    return;
  }

  try {
    await connectDevice(targetName);
    try {
      const devices = (await discoverDevices()) as SidecarDevice[];
      const device = devices.find((d) => d.name.toLowerCase() === targetName!.toLowerCase());
      if (device) {
        await markConnected(device.id, device.name);
      }
    } catch {
      // Non-critical: history tracking failed
    }
    await showHUD(`Connected to ${targetName}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await showHUD(`Failed to connect to ${targetName}: ${message}`);
  }
}
