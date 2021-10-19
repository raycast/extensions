import { showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async () => {
  const script = `tell application "Spotify"
  set currentvol to get sound volume
  -- volume wraps at 100 to 0
  if currentvol > 90 then
      set sound volume to 100
  else
      set sound volume to currentvol + 10
  end if
  return currentvol
end tell`;

const result = await runAppleScript(script);
console.log(result);

  await showHUD(result);
}