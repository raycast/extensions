import { execFile } from "node:child_process";
import { getLockDockPath } from "./binary";

export interface DockStatus {
  displays: string[];
  location: number;
  target?: number;
}

export const SUPPORTED_LOCKDOCK_MAJOR_VERSION = 0;

export class LockdockNotRunningError extends Error {
  constructor(message = "Cannot connect to lockdock. Start daemon and try again.") {
    super(message);
    this.name = "LockdockNotRunningError";
  }
}

export class LockdockUnsupportedVersionError extends Error {
  constructor(readonly version: string) {
    super(`Lockdock ${version} is not supported by this extension.`);
    this.name = "LockdockUnsupportedVersionError";
  }
}

const ANSI_SEQUENCE_PATTERN = new RegExp(`${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`, "g");

export async function getState(): Promise<DockStatus> {
  await assertCompatibleVersion();
  return runLockdock(["list"]).then(parseStatus);
}

export async function lockDock(target: number): Promise<void> {
  await runLockdock(["lock", String(target)]);
}

export async function unlockDock(): Promise<void> {
  await runLockdock(["unlock"]);
}

async function runLockdock(args: string[]): Promise<string> {
  const binPath = getLockDockPath();

  return new Promise((resolve, reject) => {
    execFile(binPath, args, (error, stdout, stderr) => {
      if (error) {
        reject(formatCommandError(stripAnsi(stderr).trim() || error.message));
        return;
      }

      resolve(stripAnsi(stdout).trim());
    });
  });
}

function stripAnsi(value: string): string {
  return value.replace(ANSI_SEQUENCE_PATTERN, "");
}

async function assertCompatibleVersion(): Promise<void> {
  const version = parseVersion(await runLockdock(["version"]));
  const major = Number(version.split(".")[0]);

  if (major !== SUPPORTED_LOCKDOCK_MAJOR_VERSION) {
    throw new LockdockUnsupportedVersionError(version);
  }
}

function parseVersion(output: string): string {
  const match = /^lockdock (\d+\.\d+\.\d+)$/.exec(output);
  if (!match) {
    throw new Error(`lockdock returned an unexpected version: ${output}`);
  }

  return match[1];
}

function parseStatus(output: string): DockStatus {
  const lines = output.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) {
    throw new Error("lockdock returned an empty display list.");
  }

  const displays: string[] = [];
  let location: number | undefined;
  let target: number | undefined;

  for (const line of lines) {
    const match = /^(\d+) - (.*?)(?: \[(current|locked|current, locked)\])?$/.exec(line);
    if (!match) {
      throw new Error(`lockdock returned an unexpected list entry: ${line}`);
    }

    const index = Number(match[1]);
    const display = match[2];
    const flags = match[3];

    displays[index] = display;
    if (flags?.includes("current")) {
      location = index;
    }
    if (flags?.includes("locked")) {
      target = index;
    }
  }

  if (location === undefined) {
    throw new Error("lockdock did not report the current Dock display.");
  }
  if (Object.keys(displays).length !== displays.length) {
    throw new Error("lockdock returned display indices in an unexpected format.");
  }

  return { displays, location, target };
}

function formatCommandError(message: string): Error {
  if (message.includes("Failed to connect to daemon socket") || message.includes("Connection refused")) {
    return new LockdockNotRunningError();
  }

  return new Error(message);
}
