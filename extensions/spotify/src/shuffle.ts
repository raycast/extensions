import { showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async () => {
  const script = `tell application "Spotify"
  set shuffling to not shuffling
  delay 0.1
  return "Shuffle is now " & shuffling
end tell`;

const result = await runAppleScript(script);
console.log(result);

  await showHUD(result);
}
