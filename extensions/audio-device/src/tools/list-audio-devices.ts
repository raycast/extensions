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
    (type === "input" ? getDefaultInputDevice() : getDefaultOutputDevice()).catch((error: unknown) => {
      if (error instanceof Error && error.message === `No default ${type} device found`) {
        return undefined;
      }
      throw error;
    }),
  ]);

  return devices.map((device) => ({
    id: String(device.id),
    name: device.name,
    isDefault: current !== undefined && String(device.id) === String(current.id),
  }));
}
