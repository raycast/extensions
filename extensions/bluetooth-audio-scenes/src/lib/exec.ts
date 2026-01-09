import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// System paths + Homebrew paths (Apple Silicon + Intel)
const SYSTEM_PATHS = "/usr/bin:/bin:/usr/sbin:/sbin";
const BREW_PATHS = "/opt/homebrew/bin:/usr/local/bin";
const PATH = `${BREW_PATHS}:${SYSTEM_PATHS}:${process.env.PATH ?? ""}`;

export async function cmd(bin: string, args: string[] = [], env?: NodeJS.ProcessEnv) {
  const { stdout } = await execFileAsync(bin, args, {
    env: { ...process.env, PATH, ...env },
  });
  return stdout?.toString() ?? "";
}

export async function exists(bin: string) {
  try {
    // Try running the command directly - more reliable than 'which' in sandboxed environments
    await execFileAsync(bin, ["--help"], { env: { ...process.env, PATH } });
    return true;
  } catch (e) {
    // ENOENT means not found, other errors mean it exists but failed
    const err = e as NodeJS.ErrnoException;
    return err.code !== "ENOENT";
  }
}

export interface Dependency {
  bin: string;
  name: string;
  brewPackage: string;
}

// Always required - for audio switching
export const CORE_DEPENDENCIES: Dependency[] = [
  {
    bin: "SwitchAudioSource",
    name: "SwitchAudioSource",
    brewPackage: "switchaudio-osx",
  },
];

// Only needed for Bluetooth features
export const BLUETOOTH_DEPENDENCY: Dependency = {
  bin: "blueutil",
  name: "blueutil",
  brewPackage: "blueutil",
};

export async function checkCoreDependencies(): Promise<Dependency[]> {
  const missing: Dependency[] = [];
  for (const dep of CORE_DEPENDENCIES) {
    if (!(await exists(dep.bin))) {
      missing.push(dep);
    }
  }
  return missing;
}

export async function checkBluetoothDependency(): Promise<boolean> {
  return await exists(BLUETOOTH_DEPENDENCY.bin);
}

export async function openApp(appName: string): Promise<void> {
  await cmd("open", ["-a", appName]);
}
