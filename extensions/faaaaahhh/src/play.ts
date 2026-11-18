import { closeMainWindow, environment, showHUD } from "@raycast/api";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";

const playFile = promisify(execFile);

export default async function Command() {
  await closeMainWindow();

  try {
    await playFile("/usr/bin/afplay", [
      join(environment.assetsPath, "faaaaahhh.m4a"),
    ]);
  } catch (error) {
    console.error("Faaaaahhh playback failed:", error);
    await showHUD("Could not play Faaaaahhh. Check the extension logs.");
  }
}
