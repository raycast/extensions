import { getPreferenceValues } from "@raycast/api";
import { expandHome } from "./fs";

type Preferences = {
  notesFolderPath: string;
};

const DEFAULT_NOTES_PATH = "/Users/samueloldmark/Documents/Notman";

export function getNotesDirectory(): string {
  const preferences = getPreferenceValues<Preferences>();
  const configuredPath = preferences.notesFolderPath?.trim();
  return expandHome(configuredPath || DEFAULT_NOTES_PATH);
}
