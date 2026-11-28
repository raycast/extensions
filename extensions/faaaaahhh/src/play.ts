import {
  closeMainWindow,
  confirmAlert,
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
  try {
    await closeMainWindow();
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
      await confirmAlert({
        title: "Could Not Play Faaaaahhh",
        message: `Playback error: ${String(error)}\n\nError report could not be saved or revealed: ${String(reportError)}`,
        primaryAction: { title: "OK" },
      });
      return;
    }

    await showHUD("Could not play Faaaaahhh. Error report revealed in Finder.");
  }
}
