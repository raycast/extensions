import {
  getDefaultInputDevice,
  getDefaultOutputDevice,
  getInputDeviceVolume,
  getOutputDeviceVolume,
  setInputDeviceMute,
  setInputDeviceVolume,
  setOutputDeviceMute,
  setOutputDeviceVolume,
  type IOType,
} from "../audio-device";

type Input = {
  /** Whether to change microphone (input) or speaker/headphone (output) volume. */
  type: IOType;
  /** Desired volume percentage, from 0 to 100. */
  volume: number;
};

/** Set the volume of the currently active input or output device. */
export default async function tool({ type, volume }: Input) {
  if (!Number.isFinite(volume) || volume < 0 || volume > 100) {
    throw new Error("Volume must be a number from 0 to 100");
  }

  const device = type === "input" ? await getDefaultInputDevice() : await getDefaultOutputDevice();
  const getVolume = type === "input" ? getInputDeviceVolume : getOutputDeviceVolume;
  const setVolume = type === "input" ? setInputDeviceVolume : setOutputDeviceVolume;
  const setMute = type === "input" ? setInputDeviceMute : setOutputDeviceMute;

  if ((await getVolume(device.id)) == null) {
    throw new Error(`${device.name} does not support volume control`);
  }

  if (volume > 0) await setMute(device.id, false).catch(() => {});
  await setVolume(device.id, volume / 100);
  return `${device.name} ${type} volume set to ${volume}%.`;
}
