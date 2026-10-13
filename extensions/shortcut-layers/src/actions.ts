import { open } from "@raycast/api";
import { spawn } from "child_process";
import { homedir } from "os";
import { getShellEnvironment, shellPath } from "./shell-env";
import type { Entry } from "./types";

const MAX_STDERR = 2000;

function expandPath(value: string): string {
  if (value === "~") return homedir();
  return value.startsWith("~/") ? value.replace("~", homedir()) : value;
}

/**
 * Runs a shell command. stdout is discarded and stderr is capped, so a verbose
 * command cannot be killed by an unused buffer.
 */
function runShellCommand(command: string, env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, { shell: shellPath(), env, stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      if (stderr.length < MAX_STDERR) stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `Exited with code ${code}`));
    });
  });
}

export interface RunResult {
  ok: boolean;
  error?: string;
}

/**
 * Runs a single entry. Mirrors the actions a Karabiner layer rule would fire:
 * open an app, open a file/folder, open a URL or deeplink (including
 * `raycast://`), or run a shell command. Reports failure instead of toasting, so
 * the caller owns the one toast it shows.
 */
export async function runEntry(entry: Entry): Promise<RunResult> {
  try {
    switch (entry.kind) {
      case "shell":
        await runShellCommand(entry.value, await getShellEnvironment());
        break;
      case "file":
        await open(expandPath(entry.value));
        break;
      default:
        await open(entry.value);
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
