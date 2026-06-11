import { showToast, Toast } from "@raycast/api";
import { unlink, access } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const SENTINEL = join(homedir(), ".mouse-jiggle.active");

export default async function StopMouseJiggle() {
  let wasRunning = false;

  try {
    await access(SENTINEL);
    await unlink(SENTINEL);
    wasRunning = true;
  } catch {
    // Sentinel doesn't exist
  }

  // Fallback: kill any orphaned swift processes running our script
  try {
    await execFileAsync("/usr/bin/pkill", ["-f", "mouse-jiggle.*jiggle.swift"]);
    wasRunning = true;
  } catch {
    // pkill exits 1 if no processes matched — that's fine
  }

  if (wasRunning) {
    await showToast({
      style: Toast.Style.Success,
      title: "Mouse Jiggle Stopped",
    });
  } else {
    await showToast({
      style: Toast.Style.Failure,
      title: "Mouse Jiggle Not Running",
    });
  }
}
