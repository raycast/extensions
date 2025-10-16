import { getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

// Bookmark utilities removed (unused)

/**
 * Run the script that opens Microsoft Edge.
 *
 * @param profileDirectory The directory of the profile to open
 * @param link The URL to open. If falsy, fallback on the value of `newBlankTabURL` in the preference.
 * @param willOpen Function to run before opening Microsoft Edge
 */
export const openEdge = async (profileDirectory: string, link: string, willOpen: () => Promise<void>) => {
  const prefs = getPreferenceValues() as Record<string, unknown>;
  const defaultLink = typeof prefs["newBlankTabURL"] === "string" ? (prefs["newBlankTabURL"] as string) : "";
  const script = `
    set theAppPath to quoted form of "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
    set theProfile to quoted form of "${profileDirectory}"
    set theLink to quoted form of "${link || defaultLink}"
    do shell script theAppPath & " --profile-directory=" & theProfile & " " & theLink
  `;

  try {
    await willOpen();
    await runAppleScript(script);
  } catch (error) {
    // Handle errors silently
  }
};
