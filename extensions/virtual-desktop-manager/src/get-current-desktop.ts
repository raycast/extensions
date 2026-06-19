import { showHUD, showToast, Toast } from "@raycast/api";
import { executeAhkCommand, findAhkPath, SCRIPTS_DIR } from "./lib/ahk-utils";
import * as fs from "fs";
import * as path from "path";

export default async function main() {
  const ahkPath = findAhkPath();
  if (!ahkPath) {
    await showToast({
      style: Toast.Style.Failure,
      title: "AutoHotkey Not Found",
      message: "Please install AutoHotkey v2",
    });
    return;
  }

  const resultPath = path.join(SCRIPTS_DIR, "_vd_result.txt");

  // Clean up any existing result file
  try {
    if (fs.existsSync(resultPath)) {
      fs.unlinkSync(resultPath);
    }
  } catch {
    // Ignore cleanup errors
  }

  const ahkCode = `
FileAppend VD.getCurrentDesktopNum(), "${resultPath.replace(/\\/g, "\\\\")}"
`;

  const success = await executeAhkCommand(ahkCode);

  if (success) {
    try {
      // Small delay to ensure file is written
      await new Promise((resolve) => setTimeout(resolve, 100));
      const result = fs.readFileSync(resultPath, "utf8").trim();
      fs.unlinkSync(resultPath);
      await showHUD(`Current Desktop: ${result}`);
    } catch {
      await showHUD("Desktop info retrieved");
    }
  } else {
    await showToast({ style: Toast.Style.Failure, title: "Failed to get desktop info" });
  }
}
