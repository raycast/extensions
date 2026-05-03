import { execSync } from "child_process";
import os from "os";

export const isMac = process.platform === "darwin";

export const isTahoe = isMac && parseInt(os.release().split(".")[0]) >= 25;

const ACTIVATE_SETTINGS = "/System/Library/PrivateFrameworks/SystemAdministration.framework/Resources/activateSettings";

export function readFnState(): boolean {
  try {
    const out = execSync("defaults read -g com.apple.keyboard.fnState", { encoding: "utf8" }).trim();
    return out === "1";
  } catch {
    return false;
  }
}

export function setFnState(standard: boolean): void {
  execSync(`defaults write -g com.apple.keyboard.fnState -bool ${standard}`);
  execSync(`${ACTIVATE_SETTINGS} -u`);
}
