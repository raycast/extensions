import { open, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { homedir } from "os";
import { promisify } from "util";
import { getShellEnvironment, shellPath } from "./shell-env";
import type { Entry } from "./types";

const execAsync = promisify(exec);

function expandPath(value: string): string {
  if (value === "~") return homedir();
  return value.startsWith("~/") ? value.replace("~", homedir()) : value;
}

/**
 * Runs a single entry. Mirrors the actions a Karabiner layer rule would fire:
 * open an app, open a file/folder, open a URL or deeplink (including
 * `raycast://`), or run a shell command.
 */
export async function runEntry(entry: Entry): Promise<void> {
  try {
    switch (entry.kind) {
      case "shell": {
        await execAsync(entry.value, { env: await getShellEnvironment(), shell: shellPath() });
        break;
      }
      case "file":
        await open(expandPath(entry.value));
        break;
      default:
        await open(entry.value);
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Could not run "${entry.title}"`,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
