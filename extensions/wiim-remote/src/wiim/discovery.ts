import { WiiMDevice } from "./types";
import {
  getManualDeviceIP,
  getCachedDeviceIP,
  setCachedDeviceIP,
  isCacheValid,
  getSelectedDeviceIP,
} from "./preferences";
import { broadcastDiscover } from "./ssdp";

// Re-export for backward compatibility
export { broadcastDiscoverAll, getLocalIP, getLocalSubnet } from "./ssdp";

/**
 * Resolves the WiiM device using priority order:
 * 1. Manual IP from Raycast preferences (if set)
 * 2. User-selected device from auto-discovery (if set)
 * 3. Cached auto-discovered IP (if still valid, within 30 minutes)
 * 4. Fresh SSDP discovery (result is cached for future calls)
 */
export async function resolveDevice(): Promise<WiiMDevice> {
  const manualIP = getManualDeviceIP();
  if (manualIP) {
    return { ip: manualIP, port: 443 };
  }

  const selectedIP = await getSelectedDeviceIP();
  if (selectedIP) {
    return { ip: selectedIP, port: 443 };
  }

  if (await isCacheValid()) {
    const cachedIP = await getCachedDeviceIP();
    if (cachedIP) {
      return { ip: cachedIP, port: 443 };
    }
  }

  const device = await broadcastDiscover();
  await setCachedDeviceIP(device.ip);
  return device;
}
