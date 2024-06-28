import { runAppleScript } from "@raycast/utils";
import fs from "fs";
import config = require("../config/modification.json");

export async function takeScreenshot(outPath: string) {
  const shellScript = `screencapture -i '${outPath}'`;
  try {
    await runAppleScript(`do shell script "${shellScript}"`, { timeout: config.screenshot.timeout });
  } catch (error) {
    console.error("Failed to take screenshot.", error);
    throw new Error("Failed to take screenshot. Possibly timed out.");
  }
  if (!fs.existsSync(outPath)) {
    console.error("Screenshot not found at path:", outPath);
    throw new Error("Something went wrong while taking the screenshot.");
  }
}
