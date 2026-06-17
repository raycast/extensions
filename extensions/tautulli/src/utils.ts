import { getPreferenceValues, Icon } from "@raycast/api";
import { ExtensionPreferences } from "./types";

export function getPlexUrlOfTitle(serverId: string, ratingKey: string): string {
  return `https://app.plex.tv/desktop/#!/server/${serverId}/details?key=%2Flibrary%2Fmetadata%2F${ratingKey}`;
}

export function capitalizeEachWord(str: string) {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function videoDecision(stream: string) {
  if (stream === "copy") return "direct stream";
  return stream;
}

export function millisecondsToTimecode(msString: string) {
  // Parse the input string to a number
  const ms = parseInt(msString);

  if (isNaN(ms) || ms < 0) {
    // throw new Error("Invalid input: Provide a non-negative number as a string.");
    return "00:00:NA";
  }

  // Calculate hours, minutes, and seconds
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1_000);

  // Format the time components to ensure 2 digits
  const formattedHours = hours.toString().padStart(2, "0");
  const formattedMinutes = minutes.toString().padStart(2, "0");
  const formattedSeconds = seconds.toString().padStart(2, "0");

  return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}

export const preferences = getPreferenceValues<ExtensionPreferences>();

export function tautulliApi(command: string) {
  return `${preferences.tautulliUrl}/api/v2?apikey=${preferences.apiKey}&cmd=${command}`;
}

export function streamStateIcon(state: string) {
  switch (state) {
    case "playing":
      return Icon.Play;
    case "paused":
      return Icon.Pause;
    case "buffering":
      return { source: "loader.svg" };
    default:
      return Icon.QuestionMarkCircle;
  }
}

export function streamTypeIcon(type: string) {
  switch (type) {
    case "direct play":
      return Icon.Switch;
    case "transcode":
      return Icon.Repeat;
    case "copy":
      return Icon.Livestream;
    default:
      return Icon.QuestionMark;
  }
}
