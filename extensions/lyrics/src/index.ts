import { getPreferenceValues, showHUD, showToast, Toast, open } from "@raycast/api";
import { runAppleScript } from "run-applescript";

type Player = { name: string; path: string; bundleId?: string };
type LyricsProvider = "https://genius.com/search?q=*" | "https://www.musixmatch.com/search/*";
type CustomLyricsProvider = string | undefined;

const { player, lyricsProvider, customLyricsProvider } = getPreferenceValues<{
  player: Player;
  lyricsProvider: LyricsProvider;
  customLyricsProvider: CustomLyricsProvider;
}>();

const script = `
  if application "${player.name}" is running then
    tell application "${player.name}" to set playerState to (player state as text)

    if playerState is "playing" or playerState is "paused" then
      tell application "${player.name}"
        return (get {name, artist} of current track)
      end tell
    else
      return "NOT_PLAYING"
    end if
  else
    return "NOT_RUNNING"
  end if
`;

export default async function main() {
  try {
    const result = await runAppleScript(script);
    if (result === "NOT_RUNNING") {
      await showToast({
        style: Toast.Style.Failure,
        title: `${player.name} is not running`,
      });
      await open(player.path);
      return;
    } else if (result === "NOT_PLAYING") {
      await showToast({
        style: Toast.Style.Failure,
        title: `${player.name} has no current track`,
      });
      return;
    } else {
      // Use custom provider if set, otherwise use selected provider
      const provider = customLyricsProvider || lyricsProvider;

      // Remove anything in parentheses or brackets (caused problems with Genius)
      // Example: "Get Lucky (feat. Pharrell Williams & Nile Rodgers)" -> "Get Lucky"
      // TODO find a better solution to include features
      const strippedResult = result.replace(/ \([^)]*\)/g, "").replace(/ *\[[^)]*\]/g, "");

      const searchURL = provider.replace("*", encodeURIComponent(strippedResult));
      await open(searchURL);

      await showHUD(`Searching lyrics for ${result}...`);
    }
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: "Failed to get current track",
    });
  }
}
