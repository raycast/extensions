import { showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async () => {
  const script = `tell application "Spotify"
	set repeating to not repeating
	delay 0.1
	return "Repeat is now " & repeating
end tell`;

const result = await runAppleScript(script);
console.log(result);

  await showHUD(result);
}

