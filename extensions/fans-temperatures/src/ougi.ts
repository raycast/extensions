import { getPreferenceValues } from "@raycast/api";
import { execFile } from "child_process";
import fs from "fs";
import { promisify } from "util";

const run = promisify(execFile);

export const BREW_INSTALL = "brew install arturious/tap/ougi";
export const DAEMON_INSTALL = "sudo ougi daemon install";
const SEARCH_PATHS = ["/opt/homebrew/bin/ougi", "/usr/local/bin/ougi"];

export interface Sensor {
  key: string;
  name: string;
  group: string;
  value: number;
}

export interface Fan {
  id: number;
  actual: number;
  min: number;
  max: number;
  target: number;
  manual: boolean;
}

export interface DaemonInfo {
  version: string;
  guard: { threshold: number; lastTrip?: { time: string; temperature: number } };
}

export interface Reading {
  version: string;
  groups: string[];
  sensors: Sensor[];
  fans: Fan[];
  daemon?: DaemonInfo;
}

/** Fan control works only when the root daemon runs the same version as the CLI. */
export type FanControl = "ready" | "missing" | "outdated";

export function fanControl(reading: Reading): FanControl {
  if (!reading.daemon) return "missing";
  return reading.daemon.version === reading.version ? "ready" : "outdated";
}

export class CliMissingError extends Error {
  constructor() {
    super("The ougi command-line tool is not installed");
  }
}

function cliPath(): string {
  const { cliPath } = getPreferenceValues<Preferences>();
  const candidates = cliPath ? [cliPath] : SEARCH_PATHS;
  const found = candidates.find((p) => {
    try {
      fs.accessSync(p, fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  });
  if (!found) throw new CliMissingError();
  return found;
}

async function ougi(timeout: number, ...args: string[]): Promise<string> {
  try {
    const { stdout } = await run(cliPath(), args, { timeout });
    return stdout;
  } catch (error) {
    if (error instanceof CliMissingError) throw error;
    if ((error as { killed?: boolean }).killed) throw new Error(`ougi did not respond within ${timeout / 1000} s`);
    const stderr = (error as { stderr?: string }).stderr?.trim();
    throw new Error(stderr?.replace(/^ougi: /, "") || (error instanceof Error ? error.message : String(error)));
  }
}

export async function read(): Promise<Reading> {
  return JSON.parse(await ougi(10_000, "read"));
}

// value: "auto", "max", an RPM number, or a percentage like "50%". Always applies to every fan.
export async function setFans(value: string): Promise<Fan[]> {
  // Taking fans over from the system takes up to ~15 s on Apple Silicon.
  return JSON.parse(await ougi(30_000, "fan", "all", value)).fans;
}
