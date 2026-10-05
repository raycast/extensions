import { getInputDevices, getOutputDevices, setDefaultInputDevice, type IOType } from "../audio-device";
import { setOutputAndSystemDevice } from "../device-actions";
import { setGraceUntil } from "../device-preferences";

type Input = {
  /** Whether to switch the microphone (input) or speakers/headphones (output). */
  type: IOType;
  /** Exact device ID returned by list-audio-devices. Do not use a device name. */
  deviceId: string;
};

/** Switch the active audio device. */
export default async function tool({ type, deviceId }: Input) {
  const devices = type === "input" ? await getInputDevices() : await getOutputDevices();
  const device = devices.find((item) => String(item.id) === deviceId);
  if (!device) throw new Error(`No ${type} device found with ID ${deviceId}`);

  if (type === "input") {
    await setDefaultInputDevice(deviceId);
  } else {
    await setOutputAndSystemDevice(deviceId);
  }

  await setGraceUntil(type, Date.now() + 60_000);

  return `Active ${type} device set to ${device.name}.`;
}
