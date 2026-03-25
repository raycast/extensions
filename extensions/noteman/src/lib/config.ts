import { getPreferenceValues } from "@raycast/api";
import { expandHome } from "./fs";

const DEFAULT_NOTES_PATH = "~/Documents/Notes";

export function getNotesDirectory(): string {
  const preferences = getPreferenceValues();
  const configuredPath = preferences.notesFolderPath?.trim();
  return expandHome(configuredPath || DEFAULT_NOTES_PATH);
}
