import { execFile, spawn } from "node:child_process";
import { closeSync, openSync } from "node:fs";
import { getPreferenceValues } from "@raycast/api";

interface ExtensionPreferences {
  theme?: string;
  command?: string;
}

export function preferences(): ExtensionPreferences {
  return getPreferenceValues<ExtensionPreferences>();
}

// Raycast starts an extension with a short PATH. A login shell reads the PATH of the
// user, so it finds node, pnpm and comarkserv. The arguments go in as "$@", with no quoting.
const SHELL = process.env.SHELL?.endsWith("/bash") ? "/bin/bash" : "/bin/zsh";
const LAUNCH =
  'if [ -n "$COMARKSERV_COMMAND" ]; then exec $COMARKSERV_COMMAND "$@"; ' +
  'elif command -v comarkserv >/dev/null 2>&1; then exec comarkserv "$@"; ' +
  'else exec npx --yes comarkserv "$@"; fi';

function environment(): NodeJS.ProcessEnv {
  return { ...process.env, COMARKSERV_COMMAND: preferences().command?.trim() ?? "", NO_COLOR: "1" };
}

/** Runs a comarkserv command and returns what it prints. */
export function runComarkserv(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      SHELL,
      ["-lc", LAUNCH, "comarkserv", ...args],
      { env: environment(), maxBuffer: 16 * 1024 * 1024, timeout: 120_000 },
      (error, stdout, stderr) => {
        if (error) reject(new Error(stderr.trim().split("\n").at(-1) || error.message));
        else resolve(stdout);
      },
    );
  });
}

/**
 * Starts comarkserv in its own process group, so it runs after Raycast closes the
 * command. The output goes to the log file. Returns the process id.
 */
export function startComarkserv(args: string[], log: string): number {
  const output = openSync(log, "w");
  const child = spawn(SHELL, ["-lc", LAUNCH, "comarkserv", ...args], {
    detached: true,
    stdio: ["ignore", output, output],
    env: environment(),
  });
  child.unref();
  closeSync(output);
  if (!child.pid) throw new Error("comarkserv did not start.");
  return child.pid;
}
