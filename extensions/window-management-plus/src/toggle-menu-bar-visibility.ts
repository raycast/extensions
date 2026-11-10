import { closeMainWindow, showHUD } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

const toggle = `tell application "System Events" to tell dock preferences
  set autohide menu bar to not autohide menu bar
  return autohide menu bar
end tell`;

// Only toggles the menu bar. Windows are left where they are.
export default async () => {
  await closeMainWindow();
  const hidden = (await run("osascript", ["-e", toggle])).stdout.trim() === "true";
  await showHUD(hidden ? "Menu bar hidden" : "Menu bar shown");
};
