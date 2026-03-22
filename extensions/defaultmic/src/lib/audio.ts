import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const CANDIDATE_PATHS = [
  "/opt/homebrew/bin/SwitchAudioSource",
  "/usr/local/bin/SwitchAudioSource",
  "/usr/bin/SwitchAudioSource",
];
const BREW_CANDIDATE_PATHS = ["/opt/homebrew/bin/brew", "/usr/local/bin/brew"];

let cachedBinaryPath: string | null = null;
let installPromise: Promise<void> | null = null;

async function isExecutable(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function resolveSwitchAudioSourcePath(): Promise<string> {
  if (cachedBinaryPath) {
    return cachedBinaryPath;
  }

  for (const candidate of CANDIDATE_PATHS) {
    if (await isExecutable(candidate)) {
      cachedBinaryPath = candidate;
      return candidate;
    }
  }

  try {
    const { stdout } = await execFileAsync("/usr/bin/which", ["SwitchAudioSource"]);
    const pathFromWhich = stdout.trim();
    if (pathFromWhich) {
      cachedBinaryPath = pathFromWhich;
      return pathFromWhich;
    }
  } catch {
    // Ignore and fall through to error.
  }

  throw new Error("SwitchAudioSource not found. Install it with: brew install switchaudio-osx");
}

async function resolveBrewPath(): Promise<string> {
  for (const candidate of BREW_CANDIDATE_PATHS) {
    if (await isExecutable(candidate)) {
      return candidate;
    }
  }

  try {
    const { stdout } = await execFileAsync("/usr/bin/which", ["brew"]);
    const pathFromWhich = stdout.trim();
    if (pathFromWhich) {
      return pathFromWhich;
    }
  } catch {
    // Ignore and fall through to error.
  }

  throw new Error("Homebrew not found. Install Homebrew first: https://brew.sh");
}

async function installSwitchAudioSourceViaBrew() {
  const brewPath = await resolveBrewPath();

  try {
    await execFileAsync(brewPath, ["install", "switchaudio-osx"], { maxBuffer: 1024 * 1024 * 10 });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to install switchaudio-osx via Homebrew: ${details}`);
  }
}

export async function installSwitchAudioSource() {
  await installSwitchAudioSourceViaBrew();
  cachedBinaryPath = null;
  await runSwitchAudioSource(["-h"]);
}

async function runSwitchAudioSource(args: string[]) {
  const binPath = await resolveSwitchAudioSourcePath();
  return execFileAsync(binPath, args, { maxBuffer: 1024 * 1024 });
}

export async function ensureSwitchAudioSourceInstalled() {
  try {
    await runSwitchAudioSource(["-h"]);
    return;
  } catch {
    // Continue with auto-install flow.
  }

  if (!installPromise) {
    installPromise = installSwitchAudioSource().finally(() => {
      installPromise = null;
    });
  }

  await installPromise;
}

export async function getInputDevices(): Promise<string[]> {
  const { stdout } = await runSwitchAudioSource(["-a", "-t", "input"]);
  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function getCurrentInputDevice(): Promise<string> {
  const { stdout } = await runSwitchAudioSource(["-c", "-t", "input"]);
  return stdout.trim();
}

export async function setInputDevice(name: string): Promise<void> {
  await runSwitchAudioSource(["-t", "input", "-s", name]);
}
