import { Clipboard, showHUD } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

export default async function Command() {
  try {
    const { stdout } = await exec("osascript", [
      "-e",
      `tell application "System Events" to set frontApp to name of first application process whose frontmost is true
      if frontApp is not "Google Chrome" then return ""
      tell application "Google Chrome" to return URL of active tab of front window`,
    ]);
    const url = stdout.trim();
    if (!url) return showHUD("Chrome is not frontmost");
    await Clipboard.copy(url);
    await showHUD(`Copied ${url}`);
  } catch (e) {
    await showHUD(`Copy URL failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}
