import { open } from "@raycast/api";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";

// spawn reports a missing file through an "error" event, so wait for "spawn" before resolving.
function spawnDetached(
  command: string,
  args: string[],
  cwd?: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      detached: true,
      stdio: "ignore",
    });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

export async function launchGame(target: string): Promise<void> {
  if (/^shell:/i.test(target)) {
    await spawnDetached("explorer.exe", [target]);
  } else if (/^[a-z][a-z0-9+.-]+:\/\//i.test(target)) {
    await open(target);
  } else {
    if (!fs.existsSync(target)) {
      throw new Error(`Game executable not found: ${target}`);
    }
    await spawnDetached(target, [], path.dirname(target));
  }
}
