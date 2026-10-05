import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Shells to try, in order of preference.
 * Each entry is [binary, ...flags] that produces a login-interactive session
 * so that ~/.zshrc / ~/.bashrc / ~/.profile are sourced.
 */
const LOGIN_SHELLS: [string, string[]][] = [
  ["/bin/zsh", ["-lic"]],
  ["/bin/bash", ["-lic"]],
  ["/bin/sh", ["-lc"]],
];

async function shellExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Run a login shell and print the requested env vars.
 * Returns a map of var-name -> value for every var that was set.
 */
async function resolveFromShell(shell: string, flags: string[], vars: string[]): Promise<Record<string, string>> {
  // Build a one-liner that prints each var on its own line as KEY=VALUE.
  // Using a unique delimiter avoids collisions with values that contain "=".
  const printScript = vars.map((v) => `printf '%s=%s\\n' '${v}' "\${${v}:-}"`).join("; ");

  try {
    const { stdout } = await execFileAsync(shell, [...flags, printScript], {
      timeout: 5_000,
      maxBuffer: 64 * 1024,
      env: { HOME: process.env.HOME ?? "" },
    });

    const result: Record<string, string> = {};
    for (const line of stdout.split("\n")) {
      const idx = line.indexOf("=");
      if (idx === -1) continue;
      const key = line.slice(0, idx);
      const value = line.slice(idx + 1).trim();
      if (vars.includes(key) && value.length > 0) {
        result[key] = value;
      }
    }
    return result;
  } catch {
    return {};
  }
}

export interface ShellEnvResult {
  COLIMA_HOME?: string;
  XDG_CONFIG_HOME?: string;
}

let cachedResult: ShellEnvResult | null = null;

/**
 * Resolve COLIMA_HOME and XDG_CONFIG_HOME by executing the user's login shell.
 * Tries zsh, bash, sh in order. Result is cached for the process lifetime.
 */
export async function resolveShellEnv(): Promise<ShellEnvResult> {
  if (cachedResult) {
    return cachedResult;
  }

  const vars = ["COLIMA_HOME", "XDG_CONFIG_HOME"];

  for (const [shell, flags] of LOGIN_SHELLS) {
    if (!(await shellExists(shell))) {
      continue;
    }

    const resolved = await resolveFromShell(shell, flags, vars);
    if (Object.keys(resolved).length > 0) {
      cachedResult = resolved;
      return cachedResult;
    }
  }

  cachedResult = {};
  return cachedResult;
}
