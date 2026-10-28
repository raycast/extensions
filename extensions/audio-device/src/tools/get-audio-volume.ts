import {
  getDefaultInputDevice,
  getDefaultOutputDevice,
  getInputDeviceVolume,
  getOutputDeviceVolume,
  type IOType,
} from "../audio-device";

type Input = {
  /** Whether to read microphone (input) or speaker/headphone (output) volume. */
  type: IOType;
};

/** Get the volume of the currently active input or output device. */
export default async function tool({ type }: Input) {
  const device = type === "input" ? await getDefaultInputDevice() : await getDefaultOutputDevice();
  const getVolume = type === "input" ? getInputDeviceVolume : getOutputDeviceVolume;
  const volume = await getVolume(device.id);

  if (volume == null) {
    throw new Error(`${device.name} does not support volume control`);
  }

  return `${device.name} ${type} volume is ${Math.round(volume * 100)}%.`;
}
