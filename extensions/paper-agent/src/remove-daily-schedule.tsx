import { popToRoot, showToast, Toast } from "@raycast/api";
import * as fs from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getSchedulePaths } from "./run-utils";

const execFileAsync = promisify(execFile);

async function unloadLaunchAgent(plistPath: string): Promise<void> {
  const uid = process.getuid?.();
  if (uid === undefined) {
    throw new Error("launchd removal is only supported on macOS.");
  }
  if (!fs.existsSync(plistPath)) {
    return;
  }
  const target = `gui/${uid}`;
  try {
    await execFileAsync("/bin/launchctl", ["bootout", target, plistPath]);
  } catch {
    // Ignore unload failures if the agent is not active.
  }
}

export default async function Command() {
  try {
    const schedulePaths = getSchedulePaths();
    await unloadLaunchAgent(schedulePaths.plistPath);

    for (const filePath of [schedulePaths.plistPath, schedulePaths.envFilePath, schedulePaths.mergedConfigPath]) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Daily schedule removed",
      message: "launchd job removed. Existing logs and status history were kept.",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to remove daily schedule",
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    await popToRoot({ clearSearchBar: true });
  }
}
