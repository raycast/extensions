import { promisify } from "node:util";
import { exec } from "child_process";
import { showToast, Toast } from "@raycast/api";
import Style = Toast.Style;

export const execAsync = promisify(exec);

export async function verifyIsMullvadInstalled() {
  try {
    // Weirdly, `which` is not available here
    await execAsync("mullvad version");
    return true;
  } catch (e) {
    console.error(e);
    await showToast(Style.Failure, "Mullvad is not installed", "You can install it from https://mullvad.net/download/");
    return false;
  }
}

export const mullvadNotInstalledHint = `
# Mullvad is not installed 
  
Please install it from [https://mullvad.net/download/](https://mullvad.net/download/)
`;
