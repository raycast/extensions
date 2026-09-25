import { Cache } from "@raycast/api";
import { Device, FunctionItem } from "./interfaces";
import { getDevices, sendCommand } from "./tuyaConnector";
import { canControlLocally, sendLocalCommand } from "./localControl";
import { DeviceSource, loadDevices, readCachedDevices, sendWithFallback, Transport } from "./deviceControl";

/** Same cache key useCachedState writes from the main command. */
const DEVICES_CACHE_KEY = "devices";

export async function loadDevicesWithFallback(): Promise<DeviceSource> {
  return loadDevices({
    cloud: getDevices,
    cached: () => readCachedDevices(new Cache().get(DEVICES_CACHE_KEY)),
  });
}

/** The single command path shared by the list, the menu bar and the AI tools. */
export async function controlDevice(device: Device, command: FunctionItem): Promise<Transport> {
  return sendWithFallback(device, command, {
    cloud: async (target, cmd) => {
      await sendCommand({ device_id: target.id, commands: [{ code: cmd.code, value: cmd.value }] });
    },
    local: sendLocalCommand,
    canLocal: canControlLocally,
  });
}
