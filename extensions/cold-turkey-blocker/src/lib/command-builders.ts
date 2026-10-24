export type StartMode = "unlocked" | "as-is" | "timed" | "password" | "random-text";
export type EntryKind = "website" | "exception";
export type BlockCreationKind = "website-app" | "device-lock" | "device-sign-out" | "device-shut-down";
export type BreakAction = "start-delay" | "stop-delay" | "stop-random-text";

export interface StartCommandOptions {
  blockName: string;
  mode: StartMode;
  minutes?: number;
  password?: string;
  randomTextLength?: number;
}

export function buildStartArgs(options: StartCommandOptions): string[] {
  const blockName = requireBlockName(options.blockName);
  const args = ["-start", blockName];

  switch (options.mode) {
    case "unlocked":
      return args;
    case "as-is":
      return [...args, "-as-is"];
    case "timed":
      return [...args, "-lock", requirePositiveInteger(options.minutes, "Lock duration")];
    case "password":
      return [...args, "-password", requirePassword(options.password)];
    case "random-text":
      return [...args, "-random-text", requireIntegerInRange(options.randomTextLength, 1, 999, "Random text length")];
  }
}

export function buildStopArgs(blockName: string, password?: string): string[] {
  const args = ["-stop", requireBlockName(blockName)];
  return password === undefined ? args : [...args, "-password", requirePassword(password)];
}

export function buildStatusArgs(blockName: string): string[] {
  return ["-status", requireBlockName(blockName)];
}

export function buildAddEntryArgs(blockName: string, kind: EntryKind, entry: string): string[] {
  const normalizedEntry = entry.trim();
  if (!normalizedEntry) throw new Error("Website or exception cannot be empty.");
  if (/[\r\n\0]/.test(normalizedEntry)) throw new Error("Each website or exception must be one line.");

  return ["-add", requireBlockName(blockName), kind === "website" ? "-web" : "-exception", normalizedEntry];
}

export function buildCreateBlockArgs(name: string, kind: BlockCreationKind): string[] {
  const blockName = requireBlockName(name);

  switch (kind) {
    case "website-app":
      return ["-add-block", blockName];
    case "device-lock":
      return ["-add-device-block", blockName];
    case "device-sign-out":
      return ["-add-device-block", blockName, "-sign-out"];
    case "device-shut-down":
      return ["-add-device-block", blockName, "-shut-down"];
  }
}

export function buildBreakArgs(blockName: string, action: BreakAction): string[] {
  const name = requireBlockName(blockName);

  switch (action) {
    case "start-delay":
      return ["-start-delay-break", name];
    case "stop-delay":
      return ["-stop-delay-break", name];
    case "stop-random-text":
      return ["-stop-random-text-break", name];
  }
}

function requireBlockName(value: string): string {
  const name = value.trim();
  if (!name) throw new Error("Select or enter a block name.");
  if (/[\r\n\0]/.test(name)) throw new Error("Block names cannot contain line breaks or null characters.");
  return name;
}

function requirePositiveInteger(value: number | undefined, label: string): string {
  if (!Number.isInteger(value) || (value ?? 0) < 1) throw new Error(`${label} must be a whole number of at least 1.`);
  return String(value);
}

function requireIntegerInRange(value: number | undefined, min: number, max: number, label: string): string {
  if (!Number.isInteger(value) || (value ?? 0) < min || (value ?? 0) > max) {
    throw new Error(`${label} must be a whole number between ${min} and ${max}.`);
  }
  return String(value);
}

function requirePassword(value: string | undefined): string {
  const password = value ?? "";
  if (!password) throw new Error("Password is required.");
  if (password.includes("\0")) throw new Error("Password cannot contain null characters.");
  return password;
}
