import { execSync } from "child_process";
import { showHUD } from "@raycast/api";
import path from "path";
import { environment } from "@raycast/api";

const HELPER_NAME = "Mac Mouse Fix Helper";
const UPDATE_HELPER_BINARY = path.join(environment.assetsPath, "update_mmf_helper");

export function isHelperRunning(): boolean {
  try {
    execSync(`pgrep -x "${HELPER_NAME}"`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function reloadHelper(): void {
  try {
    execSync(`"${UPDATE_HELPER_BINARY}"`, { stdio: "ignore" });
  } catch (error) {
    console.log(error);
    throw new Error("Could not reload Mac Mouse Fix Helper");
  }
}

export function restartHelper(): void {
  try {
    execSync(`killall "${HELPER_NAME}"`, { stdio: "ignore" });
  } catch {
    showHUD("");
  }
}
