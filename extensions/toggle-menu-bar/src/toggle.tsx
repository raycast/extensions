import { runAppleScript } from "run-applescript";
import { closeMainWindow } from "@raycast/api";

const script = `
tell application "System Events"
	if autohide menu bar of dock preferences then
		set autohide menu bar of dock preferences to false
	else
		set autohide menu bar of dock preferences to true
	end if
end tell
`;

export default async function Command() {
  await runAppleScript(script);
  await closeMainWindow({ clearRootSearch: true });
}
