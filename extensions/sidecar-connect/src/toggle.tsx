import { getPreferenceValues, showHUD } from "@raycast/api";
import { connectDevice, disconnectDevice, discoverDevices } from "./lib/swift-bridge";
import { getFavoriteDeviceName, markConnected } from "./lib/display-store";
import { SidecarDevice } from "./lib/types";

export default async function Toggle() {
  const preferences = getPreferenceValues<Preferences>();

  // Determine target: preference > favorite > first available/connected
  let targetName = preferences.defaultDevice?.trim();

  if (!targetName) {
    targetName = await getFavoriteDeviceName();
  }

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

  // Find the target device, or fall back to any connected/available device
  let target = targetName ? devices.find((d) => d.name.toLowerCase() === targetName!.toLowerCase()) : undefined;

  if (targetName && !target) {
    await showHUD(`Preferred device not found: ${targetName}`);
    return;
  }

  if (!target) {
    // Prefer a connected device (so we disconnect it), otherwise first available
    target = devices.find((d) => d.isConnected) ?? devices[0];
  }

  try {
    if (target.isConnected) {
      await disconnectDevice(target.name);
      await showHUD(`Disconnected from ${target.name}`);
    } else {
      await connectDevice(target.name);
      await markConnected(target.id, target.name);
      await showHUD(`Connected to ${target.name}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const action = target.isConnected ? "disconnect from" : "connect to";
    await showHUD(`Failed to ${action} ${target.name}: ${message}`);
  }
}
