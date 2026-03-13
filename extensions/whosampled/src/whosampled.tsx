import { showHUD, open } from "@raycast/api";
import { runAppleScript } from "run-applescript";

const WhoSampledURL = "https://www.whosampled.com/search/?q=*";

const script = `
if application "Spotify" is running then
	tell application "Spotify" to set playerState to (player state as text)

	if playerState is "playing" or playerState is "paused" then
		tell application "Spotify"
      return name of current track & " " & artist of current track
		end tell
	else
		return "NOT_PLAYING"
	end if
else
	return "NOT_RUNNING"
end if
  `;

export default async function main() {
  const result = await runAppleScript(script);
  if (result === "NOT_RUNNING") {
    await showHUD("❌ Spotify is not running");
    return;
  }

  if (result === "NOT_PLAYING") {
    await showHUD(" ❌ Spotify is not playing");
    return;
  }

  const strippedResult = result.replace(/ \([^)]*\)/g, "").replace(/ *\[[^)]*\]/g, "");
  console.log(strippedResult);
  const searchURL = WhoSampledURL.replace("*", encodeURIComponent(strippedResult));
  await open(searchURL);
  await showHUD(`Searching WhoSampled for ${result}...`);
}
