import { runAppleScript } from "@raycast/utils";
import { checkSpotifyApp } from "../helpers/isSpotifyInstalled";

export async function getSpotifyAppData() {
  const isSpotifyInstalled = await checkSpotifyApp();

  if (isSpotifyInstalled) {
    const script = `
    if application "Spotify" is not running then
        return "Not running"
    end if
  
    return "Running"`;

    const scriptResponse = await runAppleScript(script);
    return scriptResponse === "Running";
  }

  return false;
}
