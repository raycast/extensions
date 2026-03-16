import { popToRoot, showToast, Toast, trash } from "@raycast/api";
import * as fs from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { DAILY_SCHEDULE_LABEL, getSchedulePaths } from "./run-utils";

const execFileAsync = promisify(execFile);

async function unloadLaunchAgent(plistPath: string): Promise<void> {
  const uid = process.getuid?.();
  if (uid === undefined) {
    throw new Error("launchd removal is only supported on macOS.");
  }
  const target = `gui/${uid}`;

  // Try unloading by service target first so removal still works
  // even if the plist file was manually deleted.
  try {
    await execFileAsync("/bin/launchctl", ["bootout", `${target}/${DAILY_SCHEDULE_LABEL}`]);
  } catch {
    // Ignore unload failures if the service is not active.
  }

  if (!fs.existsSync(plistPath)) {
    return;
  }

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
        await trash(filePath);
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
