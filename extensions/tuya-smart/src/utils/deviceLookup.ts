import { Device, FunctionItem } from "./interfaces";
import { isSwitchStatus } from "./filters";
import { cleanName, statusLabel } from "./deviceSemantics";

const normalize = (value: string) => value.trim().toLowerCase();

/**
 * Every device a free-text name could plausibly mean, most specific tier first. An
 * exact name wins outright even when it is also a substring of other names, so
 * "Ventanal" resolves cleanly despite "Ventana ..." devices existing.
 */
export function matchingDevices(devices: Device[], query: string): Device[] {
  const needle = normalize(query ?? "");
  if (!needle) return [];

  const tiers = [
    devices.filter((device) => device.id === query),
    devices.filter((device) => normalize(device.name) === needle),
    devices.filter((device) => normalize(device.name).startsWith(needle)),
    devices.filter((device) => normalize(device.name).includes(needle)),
    devices.filter((device) => needle.includes(normalize(device.name))),
  ];

  return tiers.find((tier) => tier.length > 0) ?? [];
}

/**
 * Resolves a name to exactly one device, or to nothing. Names in a Tuya account overlap
 * heavily — "tomacorriente" can match five of them, one being a fridge — so an ambiguous
 * query must be refused rather than answered with whichever matched first.
 */
export function findDeviceByName(devices: Device[], query: string): Device | undefined {
  const matches = matchingDevices(devices, query);
  return matches.length === 1 ? matches[0] : undefined;
}

/**
 * Only a device carrying exactly this name, or this id. Used where a loose match would be
 * a misreading rather than a convenience, such as deciding whether a leading "open" is a
 * verb or the first word of the device's own name.
 */
export function findDeviceByExactName(devices: Device[], query: string): Device | undefined {
  const needle = normalize(query ?? "");
  if (!needle) return undefined;

  const matches = devices.filter((device) => device.id === query || normalize(device.name) === needle);
  return matches.length === 1 ? matches[0] : undefined;
}

/** Every switch on the device a name could plausibly mean, most specific tier first. */
export function matchingSwitches(device: Device, query: string): FunctionItem[] {
  const switches = (device.status ?? []).filter(isSwitchStatus);
  const needle = normalize(query ?? "");
  if (!needle) return [];

  const tiers = [
    switches.filter((status) => normalize(status.name ?? "") === needle),
    switches.filter((status) => normalize(status.code) === needle),
    // The label is what the UI and the AI tools show, so it is the name a request comes
    // back with: an unnamed "switch_1" is asked for as "Switch 1".
    switches.filter((status) => normalize(statusLabel(status)) === needle),
    switches.filter((status) => normalize(status.name ?? status.code).includes(needle)),
    switches.filter((status) => normalize(statusLabel(status)).includes(needle)),
  ];

  return tiers.find((tier) => tier.length > 0) ?? [];
}

/**
 * Picks the switch a request refers to. A name that matches nothing, or that matches
 * several gangs of the same outlet, resolves to nothing: silently operating a different
 * relay than the one asked for is the worst thing this extension could do.
 */
export function findSwitchOnDevice(device: Device, query?: string): FunctionItem | undefined {
  const switches = (device.status ?? []).filter(isSwitchStatus);
  if (switches.length === 0) return undefined;
  // Omitting the name is only unambiguous when there is one switch to mean. On a
  // multi-gang outlet, status order is Tuya's, not a statement of which one was meant.
  if (!query) return switches.length === 1 ? switches[0] : undefined;

  const matches = matchingSwitches(device, query);
  return matches.length === 1 ? matches[0] : undefined;
}

/**
 * The message an AI tool returns when a name could not be resolved. Naming the
 * candidates lets the assistant ask which one was meant instead of retrying blindly.
 */
export function describeDeviceMiss(devices: Device[], query: string): string {
  const matches = matchingDevices(devices, query);
  if (matches.length === 0) {
    return `There is no device called "${query}". Call list-devices to see the names that exist.`;
  }
  const names = matches.map((device) => cleanName(device.name)).join(", ");
  return `"${query}" matches ${matches.length} devices: ${names}. Ask the user which one they meant.`;
}

export function describeSwitchMiss(device: Device, query: string): string {
  const all = (device.status ?? []).filter(isSwitchStatus).map(statusLabel);
  if (all.length === 0) {
    return `${cleanName(device.name)} has nothing that can be switched on or off.`;
  }
  if (!query) {
    return `${cleanName(device.name)} has ${all.length} switches: ${all.join(", ")}. Ask the user which one they meant.`;
  }
  const matches = matchingSwitches(device, query);
  if (matches.length === 0) {
    return `${cleanName(device.name)} has no switch called "${query}". It has: ${all.join(", ")}.`;
  }
  const names = matches.map(statusLabel).join(", ");
  return `"${query}" matches ${matches.length} switches on ${cleanName(device.name)}: ${names}. Ask the user which one they meant.`;
}
