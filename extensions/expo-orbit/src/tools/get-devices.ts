import { listDevices } from "../lib/devices";
import { getDeviceKey, getOrganization } from "../lib/organization";
import { getKindLabel, getStatusLabel } from "../lib/presentation";

/** Lists the simulators, emulators and connected devices Expo Orbit can use. */
export default async function tool() {
  const [{ devices, errors }, { pinned, hidden }] = await Promise.all([listDevices(), getOrganization()]);
  return {
    devices: devices.map((device) => ({
      id: device.id,
      name: device.name,
      os: device.osType,
      osVersion: device.osVersion,
      type: device.kind === "device" ? "Physical Device" : getKindLabel(device),
      status: getStatusLabel(device),
      isRunning: device.isRunning,
      model: device.model,
      connection: device.connectionType,
      pinned: pinned.includes(getDeviceKey(device)),
      hidden: hidden.includes(getDeviceKey(device)),
    })),
    problems: errors.map(({ platform, error }) => ({ platform, message: error.message })),
  };
}
