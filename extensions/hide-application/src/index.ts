import { getFrontmostApplication } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async function main() {
  const currentApplication = await getFrontmostApplication();
  await runAppleScript(`
    tell application "System Events"
      set visible of application process "${currentApplication.name}" to False
    end tell
  `);
}
