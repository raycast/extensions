import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";
import { environment, getPreferenceValues } from "@raycast/api";

export type Display = {
  id: number;
  name: string;
  builtin: boolean;
  hdrCapable: boolean;
  hdr: boolean;
};

export type Selector = { id: number } | { name: string } | { external: true };

export class HdrctlError extends Error {
  readonly code: number;

  constructor(code: number, message: string) {
    super(message);
    this.name = "HdrctlError";
    this.code = code;
  }
}

const execFileAsync = promisify(execFile);

/** Copies assets/hdrctl into supportPath when missing or changed, returns path. */
export async function ensureBinary(): Promise<string> {
  const source = path.join(environment.assetsPath, "hdrctl");
  const destination = path.join(environment.supportPath, "hdrctl");

  try {
    await fs.access(source);
  } catch {
    throw new Error(`The hdrctl binary is missing at ${source}. Run \`make\` in the extension folder to build it.`);
  }

  const sourceHash = await sha256(source);
  const destinationHash = await sha256OrNull(destination);

  if (sourceHash === destinationHash) {
    // Still enforce the mode: a restored or rewritten copy may have lost it.
    await fs.chmod(destination, 0o755);
    return destination;
  }

  await fs.mkdir(environment.supportPath, { recursive: true });
  await fs.copyFile(source, destination);
  await fs.chmod(destination, 0o755);

  return destination;
}

/** Absolute path to the executable copy in supportPath. Calls ensureBinary first. */
export async function binaryPath(): Promise<string> {
  return ensureBinary();
}

export async function listDisplays(): Promise<Display[]> {
  const stdout = await runHdrctl(["list", "--json"]);
  return parseDisplays(stdout);
}

export async function getState(selector?: Selector): Promise<"on" | "off"> {
  const stdout = await runHdrctl(["get", ...selectorArgs(selector)]);
  return parseState(stdout);
}

export async function setState(selector: Selector | undefined, value: "on" | "off" | "toggle"): Promise<"on" | "off"> {
  const stdout = await runHdrctl(["set", ...selectorArgs(selector), "--value", value, "--wait", "2500"]);
  return parseState(stdout);
}

/** Preference-aware: named display if configured, otherwise { external: true }. */
export function targetSelector(): Selector | undefined {
  const preferences = getPreferenceValues<{ displayName?: string }>();
  const name = typeof preferences.displayName === "string" ? preferences.displayName.trim() : "";

  return name.length > 0 ? { name } : undefined;
}

/** Resolves the target to a connected Display, or throws HdrctlError. */
export async function resolveTarget(): Promise<Display> {
  const selector = targetSelector();
  const displays = await listDisplays();

  let display: Display | undefined;

  if (selector !== undefined && "id" in selector) {
    display = displays.find((candidate) => candidate.id === selector.id);
    if (display === undefined) {
      throw new HdrctlError(2, `No display with ID ${selector.id} is connected.`);
    }
  } else if (selector !== undefined && "name" in selector) {
    const wanted = selector.name.toLowerCase();
    display = displays.find((candidate) => candidate.name.toLowerCase() === wanted);
    if (display === undefined) {
      throw new HdrctlError(2, `No display named "${selector.name}" is connected.`);
    }
  } else {
    display = displays.find((candidate) => candidate.builtin === false && candidate.hdrCapable === true);
    if (display === undefined) {
      throw new HdrctlError(2, "No external HDR-capable display is connected.");
    }
  }

  if (display.hdrCapable !== true) {
    throw new HdrctlError(3, `"${display.name}" does not support HDR.`);
  }

  return display;
}

async function runHdrctl(args: string[]): Promise<string> {
  const executable = await binaryPath();

  try {
    const result = await execFileAsync(executable, args, {
      encoding: "utf8",
      timeout: 15000,
    });
    const output = outputToText(result.stdout);
    if (output === undefined) {
      throw new HdrctlError(1, "hdrctl returned no stdout output.");
    }
    return output;
  } catch (error) {
    throw toHdrctlError(error);
  }
}

function selectorArgs(selector: Selector | undefined): string[] {
  if (selector === undefined) {
    return [];
  }

  if ("id" in selector) {
    return ["--id", String(selector.id)];
  }

  if ("name" in selector) {
    return ["--name", selector.name];
  }

  return ["--external"];
}

function parseDisplays(stdout: string): Display[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new HdrctlError(1, "hdrctl returned invalid JSON for the display list.");
  }

  if (!Array.isArray(parsed)) {
    throw new HdrctlError(1, "hdrctl returned an unexpected display list.");
  }

  const entries: unknown[] = parsed;
  return entries.map((entry, index) => parseDisplay(entry, index));
}

function parseDisplay(entry: unknown, index: number): Display {
  if (typeof entry !== "object" || entry === null) {
    throw new HdrctlError(1, `hdrctl returned malformed display data at index ${index}.`);
  }

  const candidate = entry as Record<string, unknown>;
  const id = candidate.id;
  const name = candidate.name;
  const builtin = candidate.builtin;
  const hdrCapable = candidate.hdrCapable;
  const hdr = candidate.hdr;

  if (
    typeof id !== "number" ||
    !Number.isInteger(id) ||
    id < 0 ||
    typeof name !== "string" ||
    typeof builtin !== "boolean" ||
    typeof hdrCapable !== "boolean" ||
    typeof hdr !== "boolean"
  ) {
    throw new HdrctlError(1, `hdrctl returned malformed display data at index ${index}.`);
  }

  return { id, name, builtin, hdrCapable, hdr };
}

function parseState(stdout: string): "on" | "off" {
  const state = stdout.trim();

  if (state === "on" || state === "off") {
    return state;
  }

  throw new HdrctlError(1, `hdrctl returned an unexpected state: ${JSON.stringify(state)}.`);
}

function toHdrctlError(error: unknown): HdrctlError {
  if (error instanceof HdrctlError) {
    return error;
  }

  if (typeof error !== "object" || error === null) {
    return new HdrctlError(1, String(error));
  }

  const failure = error as Record<string, unknown>;
  const stderr = outputToText(failure.stderr);
  const stderrLine =
    stderr === undefined
      ? undefined
      : stderr
          .split(/\r?\n/)
          .map((line) => line.trim())
          .find((line) => line.length > 0);

  const fallback =
    failure.killed === true
      ? "hdrctl did not respond in time."
      : typeof failure.message === "string" && failure.message.length > 0
        ? failure.message
        : "hdrctl failed.";

  const rawCode = failure.code;
  const code = typeof rawCode === "number" && Number.isInteger(rawCode) && rawCode > 0 ? rawCode : 1;

  return new HdrctlError(code, stderrLine ?? fallback);
}

async function sha256(file: string): Promise<string> {
  const contents = await fs.readFile(file);
  return createHash("sha256").update(contents).digest("hex");
}

async function sha256OrNull(file: string): Promise<string | null> {
  try {
    return await sha256(file);
  } catch (error) {
    if (isMissingFile(error)) {
      return null;
    }
    throw error;
  }
}

function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as Record<string, unknown>).code === "ENOENT";
}

function outputToText(output: unknown): string | undefined {
  if (typeof output === "string") {
    return output;
  }

  if (output instanceof Uint8Array) {
    return Buffer.from(output).toString("utf8");
  }

  return undefined;
}
