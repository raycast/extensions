import { runAppleScript } from "@raycast/utils";

export default async function () {
  await runAppleScript(
    `
tell application "System Events"
	set processList to name of every process

	-- Check if the app is running
	if processList contains "AnypointStudio" then
		tell application "AnypointStudio" to quit
	end if
end tell

-- Wait until the application is fully closed
repeat until not (application "AnypointStudio" is running)
    delay 0.5
end repeat

-- Restart the application
tell application "AnypointStudio" to activate
`,
  );
}
