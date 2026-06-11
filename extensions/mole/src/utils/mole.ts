import { existsSync } from "fs";
import { execFile } from "child_process";
import { getPreferenceValues } from "@raycast/api";

const DEFAULT_PATHS = ["/opt/homebrew/bin/mo", "/usr/local/bin/mo"];

export class MoleNotInstalledError extends Error {
  constructor() {
    super("Mole (mo) is not installed or not found in PATH. Install it with: brew install mole");
    this.name = "MoleNotInstalledError";
  }
}

export function getMolePath(): string {
  const prefs = getPreferenceValues<ExtensionPreferences>();

  if (prefs.molePath && existsSync(prefs.molePath)) {
    return prefs.molePath;
  }

  for (const candidate of DEFAULT_PATHS) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new MoleNotInstalledError();
}

export function getMolePathSafe(): string | null {
  try {
    return getMolePath();
  } catch {
    return null;
  }
}

interface RunMoleOptions {
  timeout?: number;
}

export const MOLE_ENV: Record<string, string> = {
  HOME: process.env.HOME || "",
  PATH: process.env.PATH || "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin",
  TERM: "xterm",
  SHELL: process.env.SHELL || "/bin/zsh",
  USER: process.env.USER || "",
  TMPDIR: process.env.TMPDIR || "/tmp",
};

export function runMole(args: string[], options?: RunMoleOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const path = getMolePath();

      execFile(
        path,
        args,
        { timeout: options?.timeout ?? 30000, maxBuffer: 10 * 1024 * 1024, env: MOLE_ENV },
        (error, stdout, stderr) => {
          const combined = [stdout, stderr].filter(Boolean).join("\n");
          if (error && !combined) {
            reject(new Error(error.message));
            return;
          }
          resolve(combined);
        },
      );
    } catch (error) {
      reject(error);
    }
  });
}
