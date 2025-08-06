import { showFailureToast } from "@raycast/utils";
import { execSync } from "child_process";

export async function getDisplayNames(): Promise<string[]> {
  try {
    const stdout = execSync('"/Applications/DockLock Plus.app/Contents/MacOS/DockLock Plus" /displays', {
      encoding: "utf8",
    });
    const names = stdout.split(/\r?\n/).filter((line) => line.trim() !== "");
    return Array.from(new Set(names));
  } catch (error) {
    await showFailureToast(error, { title: "Error fetching display names" });
    return [];
  }
}

export function isDockLockPlusInstalled(): boolean {
  try {
    execSync('open -Ra "DockLock Plus"');
    return true;
  } catch {
    return false;
  }
}
