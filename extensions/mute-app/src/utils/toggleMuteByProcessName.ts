import { environment } from "@raycast/api";
import { execSync } from "child_process";
import path from "path";

/**
 * Toggles the mute status of an application by its process name using sound_volume_view.exe.
 * @param processName - The name of the process to toggle mute (e.g., "chrome.exe")
 */
export async function toggleMuteByProcessName(processName: string): Promise<void> {
  const svclPath = path.join(environment.assetsPath, "sound_volume_view.exe");

  execSync(`"${svclPath}" /Switch "${processName}"`, {
    encoding: "utf-8",
    windowsHide: true,
  });
}
