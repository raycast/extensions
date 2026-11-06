import type { RokuApp, RokuDevice } from "./types";

export interface TargetAlias {
  alias: string;
  deviceId: string;
  appId: string;
}
export interface InstructionSettings {
  roomAliases: Record<string, string>;
  targetAliases: TargetAlias[];
  protectedDeviceIds: string[];
}
export const EMPTY_INSTRUCTION_SETTINGS: InstructionSettings = {
  roomAliases: {},
  targetAliases: [],
  protectedDeviceIds: [],
};
export interface InstructionRoutine {
  id: string;
  name: string;
  deviceId: string;
}
export interface InstructionContext {
  devices: RokuDevice[];
  selectedDeviceId?: string;
  appsByDevice: Record<string, RokuApp[]>;
  routines: InstructionRoutine[];
  settings: InstructionSettings;
}
interface StepTarget {
  deviceId: string;
  deviceName: string;
  explicitTarget: boolean;
}
export type InstructionStep = StepTarget &
  (
    | { kind: "keypress"; key: string; count: number }
    | { kind: "launch"; appId: string; appName: string }
    | { kind: "routine"; routineId: string; routineName: string }
    | { kind: "restore" }
  );
export interface InstructionPlan {
  text: string;
  steps: InstructionStep[];
  preview: string[];
}
export type InstructionErrorCode =
  | "unknown-command"
  | "unknown-device"
  | "ambiguous-device"
  | "protected-device"
  | "unknown-app"
  | "ambiguous-app"
  | "unknown-routine"
  | "ambiguous-routine"
  | "unsupported-state"
  | "invalid-count";
export class InstructionError extends Error {
  constructor(
    public readonly code: InstructionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "InstructionError";
  }
}
export function normalizeInstructionName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}
function canonicalRoom(value: string): string {
  return normalizeInstructionName(value)
    .replace(/^the\s+/, "")
    .replace(/\s+(?:roku\s+tv|roku|tv)$/, "");
}
function targetFor(device: RokuDevice, explicitTarget: boolean, context: InstructionContext): StepTarget {
  if (!explicitTarget && context.settings.protectedDeviceIds.includes(device.id)) {
    throw new InstructionError(
      "protected-device",
      `Name ${device.name} explicitly in the instruction; it requires an explicit TV target.`,
    );
  }
  return { deviceId: device.id, deviceName: device.name, explicitTarget };
}
function resolveDevice(name: string | undefined, context: InstructionContext): RokuDevice {
  if (!name) {
    const selected = context.devices.find((device) => device.id === context.selectedDeviceId);
    if (selected) return selected;
    throw new InstructionError(
      "ambiguous-device",
      "Name the TV in your instruction or choose a default in Manage Roku TVs.",
    );
  }
  const room = canonicalRoom(name);
  const ids = new Set<string>();
  for (const device of context.devices) {
    if (canonicalRoom(device.name) === room) ids.add(device.id);
  }
  for (const [alias, id] of Object.entries(context.settings.roomAliases)) {
    if (canonicalRoom(alias) === room && context.devices.some((device) => device.id === id)) ids.add(id);
  }
  if (ids.size > 1)
    throw new InstructionError(
      "ambiguous-device",
      `“${name}” matches more than one TV. Use a unique TV name or alias.`,
    );
  const device = context.devices.find((candidate) => ids.has(candidate.id));
  if (!device)
    throw new InstructionError(
      "unknown-device",
      `No saved TV matches “${name}”. Add a room alias or use its saved name.`,
    );
  return device;
}
function appStep(name: string, target: StepTarget, context: InstructionContext): InstructionStep {
  const wanted = normalizeInstructionName(name);
  const apps = context.appsByDevice[target.deviceId] ?? [];
  const ids = new Set(apps.filter((app) => normalizeInstructionName(app.name) === wanted).map((app) => app.id));
  for (const alias of context.settings.targetAliases) {
    if (alias.deviceId === target.deviceId && normalizeInstructionName(alias.alias) === wanted) ids.add(alias.appId);
  }
  if (ids.size > 1)
    throw new InstructionError(
      "ambiguous-app",
      `“${name}” matches more than one app or input on ${target.deviceName}. Change its alias.`,
    );
  const app = apps.find((candidate) => ids.has(candidate.id));
  if (!app)
    throw new InstructionError(
      "unknown-app",
      `No available app or input matches “${name}” on ${target.deviceName}. Refresh its apps or add an alias.`,
    );
  return { ...target, kind: "launch", appId: app.id, appName: app.name };
}
const NUMBERS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};
function count(value?: string): number {
  if (!value) return 1;
  const result = NUMBERS[value] ?? Number(value);
  if (!Number.isInteger(result) || result < 1 || result > 20)
    throw new InstructionError("invalid-count", "Use a whole number from 1 to 20 volume steps.");
  return result;
}
function cleanCommand(value: string): string {
  return value
    .trim()
    .replace(/[.!?]+$/, "")
    .replace(/^please\s+/i, "");
}
function routineStep(
  matching: InstructionRoutine[],
  name: string,
  context: InstructionContext,
  room?: string,
): InstructionStep {
  if (room) {
    const device = resolveDevice(room, context);
    matching = matching.filter((routine) => routine.deviceId === device.id);
  }
  if (matching.length > 1)
    throw new InstructionError(
      "ambiguous-routine",
      `“${name}” matches multiple routines. Name the TV or use a unique routine name.`,
    );
  if (!matching.length)
    throw new InstructionError("unknown-routine", `No saved routine matches “${name}” for that TV.`);
  const routine = matching[0];
  const device = context.devices.find((candidate) => candidate.id === routine.deviceId);
  if (!device)
    throw new InstructionError("unknown-device", "The routine's TV is no longer saved. Edit the routine first.");
  return {
    ...targetFor(device, room !== undefined, context),
    kind: "routine",
    routineId: routine.id,
    routineName: routine.name,
  };
}
/** Match saved names before treating words inside them as conjunctions or TV suffixes. */
function matchRoutine(raw: string, context: InstructionContext, wholeInstruction = false): InstructionStep | undefined {
  const name = normalizeInstructionName(cleanCommand(raw).replace(/^run\s+/i, ""));
  const exact = context.routines.filter((routine) => normalizeInstructionName(routine.name) === name);
  if (exact.length) return routineStep(exact, name, context);
  const suffixed = context.routines.flatMap((routine) => {
    const routineName = normalizeInstructionName(routine.name);
    if (!name.startsWith(`${routineName} `)) return [];
    const suffix = name
      .slice(routineName.length)
      .trim()
      .match(/^(?:on|in|for)\s+(.+)$/);
    return suffix ? [{ routine, room: suffix[1], length: routineName.length }] : [];
  });
  if (!suffixed.length) return undefined;
  const longest = Math.max(...suffixed.map((match) => match.length));
  const matches = suffixed.filter((match) => match.length === longest);
  if (wholeInstruction && /\s+(?:and then|then|and)\s+/i.test(matches[0].room)) {
    try {
      resolveDevice(matches[0].room, context);
    } catch (error) {
      // A following command is not part of the room suffix; let clause parsing handle it.
      if (error instanceof InstructionError && error.code === "unknown-device") return undefined;
      throw error;
    }
  }
  return routineStep(
    matches.map((match) => match.routine),
    matches[0].routine.name,
    context,
    matches[0].room,
  );
}
function parseClause(raw: string, context: InstructionContext): InstructionStep {
  let command = cleanCommand(raw);
  const routine = matchRoutine(command, context);
  if (routine) return routine;
  if (/^run\s+/i.test(command))
    throw new InstructionError("unknown-routine", `No saved routine matches “${command.replace(/^run\s+/i, "")}”.`);
  let room: string | undefined;
  let forcedApp: string | undefined;
  const switchTarget = command.match(/^switch\s+(.+?)\s+to\s+(.+)$/i);
  const powerTarget =
    command.match(/^(?:turn|power)\s+(on|off)\s+(.+)$/i) ??
    command
      .match(/^(?:turn|power)\s+(.+?)\s+(on|off)$/i)
      ?.map((value, index, all) => (index === 1 ? all[2] : index === 2 ? all[1] : value));
  if (switchTarget) {
    room = switchTarget[1];
    forcedApp = switchTarget[2];
    command = "open";
  } else if (powerTarget) {
    room = powerTarget[2];
    command = `turn ${powerTarget[1]}`;
  } else {
    const suffix = command.match(/^(.*?)\s+(?:on|in|for)\s+(?:the\s+)?(.+)$/i);
    if (suffix) {
      command = suffix[1];
      room = suffix[2];
    }
  }
  const normalized = normalizeInstructionName(command);
  if (normalized === "mute" || normalized === "unmute") {
    throw new InstructionError(
      "unsupported-state",
      "I can't verify whether the TV is already muted. Use ‘toggle mute’ to explicitly switch its current mute state. Nothing has run.",
    );
  }
  if (normalized === "play" || normalized === "pause") {
    throw new InstructionError(
      "unsupported-state",
      "I can't verify the current playback state. Use ‘play/pause’ or ‘toggle playback’ to explicitly switch it. Nothing has run.",
    );
  }
  const device = resolveDevice(room, context);
  const target = targetFor(device, room !== undefined, context);
  const app = forcedApp ?? command.match(/^(?:open|launch|start|switch to)\s+(.+)$/i)?.[1];
  if (app) return appStep(app, target, context);
  if (
    /^(?:restore|go back to what was open|return to what was open|restore previous app|restore previous input)$/.test(
      normalized,
    )
  )
    return { ...target, kind: "restore" };
  const volume =
    normalized.match(
      /^(?:lower|decrease|reduce|turn down)\s+(?:the\s+)?volume(?:\s+(?:by\s+)?([a-z]+|\d+)(?:\s+steps?)?)?$/,
    ) ?? normalized.match(/^volume\s+down(?:\s+([a-z]+|\d+)(?:\s+steps?)?)?$/);
  if (volume) return { ...target, kind: "keypress", key: "VolumeDown", count: count(volume[1]) };
  const louder =
    normalized.match(/^(?:raise|increase|turn up)\s+(?:the\s+)?volume(?:\s+(?:by\s+)?([a-z]+|\d+)(?:\s+steps?)?)?$/) ??
    normalized.match(/^volume\s+up(?:\s+([a-z]+|\d+)(?:\s+steps?)?)?$/);
  if (louder) return { ...target, kind: "keypress", key: "VolumeUp", count: count(louder[1]) };
  const keys: Record<string, string> = {
    home: "Home",
    "go home": "Home",
    "go to home": "Home",
    back: "Back",
    "go back": "Back",
    "play pause": "Play",
    "play/pause": "Play",
    "toggle playback": "Play",
    "toggle mute": "VolumeMute",
    "turn on": "PowerOn",
    "power on": "PowerOn",
    "turn off": "PowerOff",
    "power off": "PowerOff",
    up: "Up",
    down: "Down",
    left: "Left",
    right: "Right",
    select: "Select",
    ok: "Select",
    rewind: "Rev",
    "fast forward": "Fwd",
    options: "Info",
  };
  const key = keys[normalized];
  if (key) return { ...target, kind: "keypress", key, count: 1 };
  throw new InstructionError(
    "unknown-command",
    `I couldn't interpret “${raw}”. Use a supported command or a saved routine name. Nothing has run.`,
  );
}
function preview(step: InstructionStep): string {
  if (step.kind === "launch") return `${step.deviceName}: open ${step.appName}`;
  if (step.kind === "routine") return `${step.deviceName}: run ${step.routineName}`;
  if (step.kind === "restore") return `${step.deviceName}: restore the previously saved app or input`;
  const labels: Record<string, string> = {
    VolumeDown: "lower volume",
    VolumeUp: "raise volume",
    VolumeMute: "toggle mute",
    Play: "toggle play/pause",
    PowerOn: "turn on",
    PowerOff: "turn off",
    Home: "go Home",
    Back: "go Back",
  };
  return `${step.deviceName}: ${labels[step.key] ?? step.key}${step.count > 1 ? ` (${step.count} steps)` : ""}`;
}
/** Resolve the entire sentence before returning. This function never sends a command. */
export function parseInstruction(text: string, context: InstructionContext): InstructionPlan {
  if (typeof text !== "string" || !text.trim() || text.length > 2000 || /(?:https?:\/\/|\n|\r)/i.test(text))
    throw new InstructionError(
      "unknown-command",
      "Enter a supported Roku instruction, without URLs or multiple lines.",
    );
  const exactRoutine = matchRoutine(text, context, true);
  if (exactRoutine) {
    const step = exactRoutine;
    return { text: text.trim(), steps: [step], preview: [preview(step)] };
  }
  if (/\b(?:and then|then|and)\s*$/i.test(text))
    throw new InstructionError("unknown-command", "Finish every command after and or then. Nothing has run.");
  const clauses = text.trim().split(/\s+(?:and then|then|and)\s+/i);
  if (clauses.length > 10 || clauses.some((clause) => !clause.trim()))
    throw new InstructionError("unknown-command", "Use between one and ten complete Roku commands.");
  const steps = clauses.map((clause) => parseClause(clause, context));
  return { text: text.trim(), steps, preview: steps.map(preview) };
}
