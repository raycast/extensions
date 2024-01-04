import { spawn } from "child_process";
import { showHUD } from "@raycast/api";

export default async function Main() {
  const applescriptCommand = `
    tell application "Microsoft Word"
      activate
      make new document
    end tell
  `;

  const openCommand = spawn("osascript", ["-e", applescriptCommand]);

  openCommand.on("close", (code) => {
    if (code === 0) {
      showHUD("Document created and opened successfully");
    } else {
      showHUD("Error creating and opening document");
    }
  });

  openCommand.on("error", (err) => {
    showHUD("Error executing command");
  });
}
