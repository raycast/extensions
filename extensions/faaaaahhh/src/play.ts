import {
  closeMainWindow,
  environment,
  showHUD,
  showInFinder,
} from "@raycast/api";
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { inspect, promisify } from "node:util";

const playFile = promisify(execFile);

export default async function Command() {
  await closeMainWindow();

  try {
    await playFile("/usr/bin/afplay", [
      join(environment.assetsPath, "faaaaahhh.m4a"),
    ]);
  } catch (error) {
    const reportPath = join(environment.supportPath, "last-playback-error.txt");

    try {
      await mkdir(environment.supportPath, { recursive: true });
      await writeFile(
        reportPath,
        `[${new Date().toISOString()}] Faaaaahhh playback failed\n\n${inspect(error, { depth: null, maxStringLength: null })}\n`,
        { encoding: "utf8", mode: 0o600 },
      );
      await showInFinder(reportPath);
    } catch (reportError) {
      throw new Error(
        `Could not play Faaaaahhh: ${String(error)}. Could not save or reveal the error report: ${String(reportError)}`,
        { cause: error },
      );
    }

    await showHUD("Could not play Faaaaahhh. Error report revealed in Finder.");
  }
}
