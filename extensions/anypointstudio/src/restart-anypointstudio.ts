import { runAppleScript } from "@raycast/utils";

export default async function () {
  await runAppleScript(
    `
tell application "System Events"
	get name of every process whose name is "Anypoint Studio"
	if result is not {} then
		tell application "AnypointStudio" to quit
	end if
  repeat until application "AnypointStudio" is not running    
    delay 0.5
  end repeat
	tell application "AnypointStudio" to activate
end tell
`,
  );
}
