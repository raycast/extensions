import { execSync } from "child_process";
import { homedir } from "os";
import { join } from "path";

export const PLIST_PATH = join(homedir(), "Library/Preferences/com.apple.coreservices.useractivityd.plist");

export function getHandoffStatus(): boolean {
  try {
    const output = execSync(`defaults read ${PLIST_PATH} ClipboardSharingEnabled 2>/dev/null || echo "0"`)
      .toString()
      .trim();
    return output === "1";
  } catch (error) {
    return false;
  }
}

export function setHandoffStatus(enable: boolean): void {
  execSync(`defaults write ${PLIST_PATH} ClipboardSharingEnabled -bool ${enable}`);

  try {
    execSync("killall useractivityd");
  } catch (error) {
    // Process might not be running, ignore error
  }
}
