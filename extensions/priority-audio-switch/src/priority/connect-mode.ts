// "Switch on Connect": a device without a priority that becomes the current device when it connects.
// Pure logic, no Raycast imports, so it can be unit-tested with node --test.
import { rankOf, type DeviceRef, type PriorityEntry } from "./decide";

/** What a device without a priority does. A device with a priority always follows its priority instead. */
export type ConnectMode = "switch" | "none";

/** User choices per device UID. A device without an entry uses its default. */
export type ConnectOverrides = Record<string, ConnectMode>;

export type ConnectDevice = DeviceRef & { transportType?: string };

const BLUETOOTH = new Set(["bluetooth", "bluetoothle"]);
/** The headphone jack of the Mac, and USB-C/Lightning to 3.5 mm adapters. */
const HEADPHONE_JACK = /\b3[.,]5\s?mm\b|headphone (jack|port)|external headphones/i;

/**
 * Default for a device the user has not set: Bluetooth devices and the headphone jack switch on connect, for
 * output only. For input this stays off: a Bluetooth headset microphone must not take over from a better
 * microphone just because the headset connected.
 */
export function defaultConnectMode(direction: "input" | "output", device: ConnectDevice): ConnectMode {
  if (direction !== "output") return "none";
  if (device.transportType && BLUETOOTH.has(device.transportType)) return "switch";
  if (device.uid === "BuiltInHeadphoneOutputDevice" || HEADPHONE_JACK.test(device.name)) return "switch";
  return "none";
}

export function connectMode(
  direction: "input" | "output",
  device: ConnectDevice,
  overrides: ConnectOverrides,
): ConnectMode {
  return overrides[device.uid] ?? defaultConnectMode(direction, device);
}

/** UIDs of connected devices that have no priority and switch on connect, in the order given. */
export function switchOnConnectUids(
  direction: "input" | "output",
  devices: ConnectDevice[],
  overrides: ConnectOverrides,
  priorities: PriorityEntry[],
): string[] {
  return devices
    .filter((d) => rankOf(d, priorities) === -1 && connectMode(direction, d, overrides) === "switch")
    .map((d) => d.uid);
}
