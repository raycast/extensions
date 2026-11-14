import { Tool } from "@raycast/api";
import { controlDevice, loadDevicesWithFallback } from "../utils/deviceSource";
import { describeDeviceMiss, describeSwitchMiss, findDeviceByName, findSwitchOnDevice } from "../utils/deviceLookup";
import { cleanName } from "../utils/deviceSemantics";

type Input = {
  /** The device name as it appears in the Tuya app, for example "Living Room Lamp". */
  deviceName: string;
  /**
   * Which switch to act on when the device exposes several, given as its name or
   * data point code. Omit it for a device with a single switch.
   */
  switchName?: string;
  /** The state to set. Omit it to flip the switch to the opposite of its current state. */
  turnOn?: boolean;
};

async function resolve(input: Input) {
  const { devices } = await loadDevicesWithFallback();
  const device = findDeviceByName(devices, input.deviceName);
  if (!device) {
    throw new Error(describeDeviceMiss(devices, input.deviceName));
  }
  const target = findSwitchOnDevice(device, input.switchName);
  if (!target) {
    // Never guess which one was meant; operating the wrong relay is worse than failing.
    throw new Error(describeSwitchMiss(device, input.switchName ?? ""));
  }
  const nextValue = input.turnOn ?? target.value !== true;
  return { device, target, nextValue };
}

/**
 * Turning something on is easy to undo; turning it off is not always, and an account
 * can easily include a fridge or a router. Only switching off asks first.
 */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const { device, target, nextValue } = await resolve(input);
  if (nextValue) return undefined;

  return {
    message: `Turn off "${target.name ?? target.code}" on ${cleanName(device.name)}?`,
    info: [
      { name: "Device", value: cleanName(device.name) },
      { name: "Switch", value: target.name ?? target.code },
      { name: "Currently", value: target.value === true ? "On" : "Off" },
    ],
  };
};

/** Turns a switch on a Tuya device on or off. */
export default async function tool(input: Input) {
  const { device, target, nextValue } = await resolve(input);

  const transport = await controlDevice(device, { ...target, value: nextValue });
  const via = transport === "local" ? " (sent over the local network, because the Tuya cloud was unreachable)" : "";

  return `${cleanName(device.name)} is now ${nextValue ? "on" : "off"}${via}.`;
}
