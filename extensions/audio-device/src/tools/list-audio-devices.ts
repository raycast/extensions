import {
  getDefaultInputDevice,
  getDefaultOutputDevice,
  getInputDevices,
  getOutputDevices,
  type IOType,
} from "../audio-device";

type Input = {
  /** Whether to list microphones (input) or speakers and headphones (output). */
  type: IOType;
};

/** List audio devices and identify the currently active device. */
export default async function tool({ type }: Input) {
  const [devices, current] = await Promise.all([
    type === "input" ? getInputDevices() : getOutputDevices(),
    type === "input" ? getDefaultInputDevice() : getDefaultOutputDevice(),
  ]);

  return devices.map((device) => ({
    id: String(device.id),
    name: device.name,
    isDefault: String(device.id) === String(current.id),
  }));
}
