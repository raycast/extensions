import { open, showHUD, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

const SEPARATOR = "\u0000";

const getCurrentTrackScript = `
tell application "Music"
	if player state is stopped then
		return "STOPPED"
	end if
	set musicArtist to artist of current track
	set musicName to name of current track
	return musicArtist & "${SEPARATOR}" & musicName
end tell
`;

/**
 * Removes characters that tend to cause noisy/irrelevant Discogs search results,
 * e.g. "Simon & Garfunkel" -> "Simon Garfunkel".
 */
function sanitize(text: string): string {
  return text.replace(/ & /g, " ").replace(/;/g, "");
}

export default async function Command() {
  try {
    const result = await runAppleScript(getCurrentTrackScript);

    if (result === "STOPPED") {
      await showHUD("🎵 Nothing is currently playing in Music");
      return;
    }

    const [rawArtist, rawName] = result.split(SEPARATOR);

    if (!rawArtist || !rawName) {
      throw new Error("Could not read the current track from Music");
    }

    const artist = sanitize(rawArtist);
    const name = sanitize(rawName);

    const query = encodeURIComponent(`${artist} ${name}`);
    const url = `https://www.discogs.com/search?q=${query}`;

    await open(url);
    await showHUD(`🔍 Searching Discogs for ${artist} – ${name}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to search on Discogs",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
