import { Tool } from "@raycast/api";
import { bootDevice } from "../lib/devices";
import { getAudioPreference } from "../lib/feedback";
import { findDevice } from "../lib/find-device";

type Input = {
  /** The `id` (iOS simulator UDID or Android AVD name) or `name` of a simulator or emulator from get-devices. */
  device: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const device = await findDevice(input.device);
  if (device.isRunning) return undefined;
  return { message: `Launch ${device.name}?` };
};

/** Boots a simulator or emulator, or brings its window to the front if it already runs. */
export default async function tool(input: Input) {
  const device = await findDevice(input.device);
  if (device.kind === "device") {
    throw new Error(`${device.name} is a physical device, so there's nothing to launch.`);
  }
  const wasRunning = device.isRunning;
  await bootDevice(device, { audio: getAudioPreference() });
  return { device: device.name, result: wasRunning ? "brought to the front" : "launched" };
}
