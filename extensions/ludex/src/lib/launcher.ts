import { open } from "@raycast/api";
import { spawn } from "child_process";
import * as path from "path";

export async function launchGame(target: string): Promise<void> {
  if (/^shell:/i.test(target)) {
    spawn("explorer.exe", [target], {
      detached: true,
      stdio: "ignore",
    }).unref();
  } else if (/^[a-z][a-z0-9+.-]+:\/\//i.test(target)) {
    await open(target);
  } else {
    spawn(target, [], {
      cwd: path.dirname(target),
      detached: true,
      stdio: "ignore",
    }).unref();
  }
}
