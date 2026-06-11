import { Application } from "@raycast/api";

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const NOTION_BUNDLE_PREFIX = "notion.id";

function escapeAppleScriptString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function isNotionDesktopApp(frontmostApplication: Application): boolean {
  const bundleId = frontmostApplication.bundleId ?? "";
  return (
    bundleId === "notion.id" ||
    bundleId.startsWith(`${NOTION_BUNDLE_PREFIX}.`) ||
    frontmostApplication.name === "Notion"
  );
}

async function runAppleScript(script: string): Promise<string> {
  const { stdout } = await execFileAsync("/usr/bin/osascript", ["-e", script]);
  return stdout.trim();
}

export async function getNotionDesktopWindowTitle(frontmostApplication: Application): Promise<string> {
  if (!isNotionDesktopApp(frontmostApplication)) {
    throw new Error("Frontmost app is not Notion desktop.");
  }

  const processName = escapeAppleScriptString(frontmostApplication.name || "Notion");

  const script = `tell application "System Events"
if not (exists process "${processName}") then error "Notion process not found."
tell process "${processName}"
if (count of windows) is 0 then error "No Notion window is open."
return name of front window
end tell
end tell`;

  return runAppleScript(script);
}
