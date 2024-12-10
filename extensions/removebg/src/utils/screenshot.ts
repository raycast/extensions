import { runAppleScript } from "@raycast/utils";
import fs from "fs";
import config = require("../config.json");
import { showToast, Toast } from "@raycast/api";

export async function takeScreenshot(outPath: string): Promise<boolean> {
  const shellScript = `screencapture -i '${outPath}'`;
  try {
    await runAppleScript(`do shell script "${shellScript}"`, { timeout: config.screenshot.timeout });
    if (!fs.existsSync(outPath)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "There was some issue capturing screenshot",
      });
      return false;
    }
    return true;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: String(error),
    });
    return false;
  }
}
