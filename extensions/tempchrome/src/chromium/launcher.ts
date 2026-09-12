import { execFile, spawn } from "node:child_process";
import { randomInt } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";

import { reportError } from "../utils/reportError";
import {
  BASE_CHROMIUM_ARGS,
  GOOGLE_ENV,
  ID_CHARSET,
  ID_LENGTH,
  LAUNCH_GRACE_WINDOW_MS,
  MAX_ID_ATTEMPTS,
} from "./constants";

export class ChromiumLaunchFailedError extends Error {
  readonly exitCode: number | null;
  readonly signal: NodeJS.Signals | null;

  constructor(exitCode: number | null, signal: NodeJS.Signals | null) {
    super(
      `Chromium exited within the launch grace window (exitCode=${exitCode}, signal=${signal})`,
    );
    this.name = "ChromiumLaunchFailedError";
    this.exitCode = exitCode;
    this.signal = signal;
  }
}

const execFileAsync = promisify(execFile);

export async function chromiumExists(binaryPath: string): Promise<boolean> {
  try {
    await fs.promises.access(binaryPath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function generateProfileId(): string {
  let id = "";
  for (let index = 0; index < ID_LENGTH; index++) {
    id += ID_CHARSET[randomInt(0, ID_CHARSET.length)];
  }
  return id;
}

export async function createTempProfile(tempBaseDir: string): Promise<string> {
  await fs.promises.mkdir(tempBaseDir, { recursive: true, mode: 0o700 });

  for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt++) {
    const id = generateProfileId();
    const candidate = path.join(tempBaseDir, id);
    try {
      await fs.promises.mkdir(candidate, { mode: 0o700 });
      return candidate;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "EEXIST") {
        continue;
      }
      throw error;
    }
  }

  throw new Error(`Failed to create unique profile directory after ${MAX_ID_ATTEMPTS} attempts`);
}

export async function clearQuarantine(appBundlePath: string): Promise<void> {
  try {
    await execFileAsync("xattr", ["-cr", appBundlePath]);
  } catch (error) {
    await reportError("Could not clear Chromium quarantine attributes", error);
  }
}

export function launchChromium(
  binaryPath: string,
  profileDir: string,
  extraArgs: string[],
): Promise<void> {
  const logPath = path.join(profileDir, "chrome_debug.log");
  const args = [
    ...BASE_CHROMIUM_ARGS,
    `--user-data-dir=${profileDir}`,
    "--enable-logging",
    `--log-file=${logPath}`,
    ...extraArgs,
  ];
  const env = { ...process.env, ...GOOGLE_ENV };

  return new Promise((resolve, reject) => {
    const child = spawn(binaryPath, args, {
      detached: true,
      stdio: "ignore",
      env,
    });

    let settled = false;

    const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.removeListener("error", onError);
      reject(new ChromiumLaunchFailedError(code, signal));
    };

    const onError = (err: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.removeListener("exit", onExit);
      reject(err);
    };

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.removeListener("exit", onExit);
      child.removeListener("error", onError);
      child.unref();
      resolve();
    }, LAUNCH_GRACE_WINDOW_MS);

    child.once("exit", onExit);
    child.once("error", onError);
  });
}
