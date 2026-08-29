import { Device, FunctionItem } from "./interfaces";
import { isSwitchStatus } from "./filters";
import { actionableEnums, cleanName, enumOptionLabel } from "./deviceSemantics";
import { parseEnumOptions } from "./lightFunctions";

export type Intent = "on" | "off" | "stop" | "toggle";

/**
 * The words a shortcut is likely to carry. "open" and "close" are folded into on and off
 * so a curtain and a lamp answer to the same phrasing; which data point that becomes is
 * decided later, from what the device actually supports.
 */
const ACTION_PHRASES: Record<string, Intent> = {
  "turn on": "on",
  "switch on": "on",
  "power on": "on",
  on: "on",
  enable: "on",
  start: "on",
  open: "on",
  activate: "on",
  "turn off": "off",
  "switch off": "off",
  "power off": "off",
  off: "off",
  disable: "off",
  close: "off",
  shut: "off",
  deactivate: "off",
  stop: "stop",
  pause: "stop",
  toggle: "toggle",
  flip: "toggle",
};

/** Longest first, so "turn on" is recognised before the bare "on" inside it. */
const PHRASES_BY_LENGTH = Object.keys(ACTION_PHRASES).sort((a, b) => b.length - a.length);

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

export interface Interpretation {
  intent: Intent;
  /** The part of the query being read as a device name. */
  name: string;
  /** Accept only a device named exactly this, never a loose partial match. */
  exactOnly?: boolean;
}

export interface ParsedRequest {
  /** Readings of the query, best first. The caller takes the first that names a device. */
  candidates: Interpretation[];
  /** Set when an explicit action argument was given but means nothing here. */
  unknownAction?: string;
}

/**
 * Reads a spoken phrase as an action plus a device name.
 *
 * "open living room curtain" and "Open Space Lamp" are the same shape, so no amount of
 * string handling separates them. Both readings are returned instead, and the device list
 * decides: a device actually called "Open Space Lamp" outranks the guess that "open" was
 * a verb. That first reading demands an exact name, or "turn off lamp" would match a
 * device called "Lamp" on the loose tiers and silently downgrade the request to a toggle.
 */
export function parseRequest(query: string, action?: string): ParsedRequest {
  const name = normalize(query ?? "");

  if (action && action.trim()) {
    const explicit = ACTION_PHRASES[normalize(action)];
    // An explicit action means the query is nothing but a name; never strip it.
    return explicit ? { candidates: [{ intent: explicit, name }] } : { candidates: [], unknownAction: action.trim() };
  }

  for (const phrase of PHRASES_BY_LENGTH) {
    const stripped = name.startsWith(`${phrase} `)
      ? name.slice(phrase.length + 1).trim()
      : name.endsWith(` ${phrase}`)
        ? name.slice(0, -(phrase.length + 1)).trim()
        : undefined;

    if (stripped) {
      return {
        candidates: [
          { intent: "toggle", name, exactOnly: true },
          { intent: ACTION_PHRASES[phrase], name: stripped },
          { intent: "toggle", name },
        ],
      };
    }
  }

  // A bare device name flips whatever it has, which is what a one-word shortcut means.
  return { candidates: [{ intent: "toggle", name }] };
}

/** The enum options an intent could plausibly mean, best first. */
const ENUM_TARGETS: Record<Intent, string[]> = {
  on: ["open", "on"],
  off: ["close", "off"],
  stop: ["stop", "pause"],
  toggle: [],
};

export type Resolution =
  { kind: "command"; command: FunctionItem; describe: string } | { kind: "refused"; reason: string };

/**
 * Turns an intent into the one command to send, or refuses.
 *
 * Refusing matters more than covering every case. A deeplink runs unattended, with no
 * list to correct afterwards, so a wrong guess moves real hardware silently.
 */
export function resolveCommand(device: Device, intent: Intent, switchName?: string): Resolution {
  const switches = (device.status ?? []).filter(isSwitchStatus);

  if (switches.length > 0) {
    return resolveSwitch(device, switches, intent, switchName);
  }

  const enums = actionableEnums(device);
  for (const target of ENUM_TARGETS[intent]) {
    for (const command of enums) {
      const option = parseEnumOptions(command.values).find((value) => value === target);
      if (option) {
        return {
          kind: "command",
          command: { ...command, value: option },
          describe: `${cleanName(device.name)} set to ${enumOptionLabel(command.code, option)}`,
        };
      }
    }
  }

  return { kind: "refused", reason: describeEnumMiss(device, intent, enums) };
}

function resolveSwitch(device: Device, switches: FunctionItem[], intent: Intent, switchName?: string): Resolution {
  if (intent === "stop") {
    return { kind: "refused", reason: `${cleanName(device.name)} cannot be stopped; it can only be turned on or off.` };
  }

  if (!switchName && switches.length > 1) {
    // Picking the first gang of a multi-outlet would switch something nobody asked for.
    const names = switches.map((status) => status.name ?? status.code).join(", ");
    return {
      kind: "refused",
      reason: `${cleanName(device.name)} has ${switches.length} switches: ${names}. Name one in the switch argument.`,
    };
  }

  const target = switchName
    ? matchOne(switches, switchName)
    : { hit: switches[0] as FunctionItem | undefined, ambiguous: [] as FunctionItem[] };

  if (!target.hit) {
    const names = switches.map((status) => status.name ?? status.code).join(", ");
    const detail = target.ambiguous.length > 0 ? "matches more than one switch" : "matches no switch";
    return {
      kind: "refused",
      reason: `"${switchName}" ${detail} on ${cleanName(device.name)}. It has: ${names}.`,
    };
  }

  const value = intent === "toggle" ? target.hit.value !== true : intent === "on";
  // On a multi-gang device the device name alone would not say what actually moved.
  const subject =
    switches.length > 1 ? `${cleanName(device.name)} ${target.hit.name ?? target.hit.code}` : cleanName(device.name);

  return {
    kind: "command",
    command: { ...target.hit, value },
    describe: `${subject} is now ${value ? "on" : "off"}`,
  };
}

/** The same refuse-when-ambiguous rule the AI tools use, applied to a switch name. */
function matchOne(switches: FunctionItem[], query: string): { hit?: FunctionItem; ambiguous: FunctionItem[] } {
  const needle = normalize(query);
  const tiers = [
    switches.filter((status) => normalize(status.name ?? "") === needle),
    switches.filter((status) => normalize(status.code) === needle),
    switches.filter((status) => normalize(status.name ?? status.code).includes(needle)),
  ];
  const matches = tiers.find((tier) => tier.length > 0) ?? [];
  return matches.length === 1 ? { hit: matches[0], ambiguous: [] } : { ambiguous: matches };
}

function describeEnumMiss(device: Device, intent: Intent, enums: FunctionItem[]): string {
  const name = cleanName(device.name);
  const options = enums.flatMap((command) =>
    parseEnumOptions(command.values).map((option) => enumOptionLabel(command.code, option)),
  );

  if (options.length === 0) {
    return `${name} has nothing that can be switched or set this way.`;
  }
  if (intent === "toggle") {
    // A curtain has no opposite of its current position worth guessing at.
    return `${name} needs an explicit action. It takes: ${options.join(", ")}.`;
  }
  return `${name} cannot be turned ${intent}. It takes: ${options.join(", ")}.`;
}
