import { Action, Tool } from "@raycast/api";
import { stopDevice } from "../lib/devices";
import { findDevice } from "../lib/find-device";

type Input = {
  /** The `id` (iOS simulator UDID or Android AVD name) or `name` of a running simulator or emulator from get-devices. */
  device: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const device = await findDevice(input.device);
  if (!device.isRunning || device.kind === "device") return undefined;
  return { style: Action.Style.Destructive, message: `Shut down ${device.name}? Unsaved state in its apps is lost.` };
};

/** Shuts down a running simulator or emulator. */
export default async function tool(input: Input) {
  const device = await findDevice(input.device);
  if (device.kind === "device") {
    throw new Error(`${device.name} is a physical device. Disconnect it instead.`);
  }
  if (!device.isRunning) {
    return { device: device.name, result: "already shut down" };
  }
  await stopDevice(device);
  return { device: device.name, result: "shut down" };
}
