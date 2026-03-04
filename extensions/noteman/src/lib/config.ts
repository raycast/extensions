import { getPreferenceValues } from "@raycast/api";
import { expandHome } from "./fs";

const DEFAULT_NOTES_PATH = "~/Documents/Notes";
type NotesPreferences = { notesFolderPath: string };

export function getNotesDirectory(): string {
  const preferences = getPreferenceValues<NotesPreferences>();
  const configuredPath = preferences.notesFolderPath?.trim();
  return expandHome(configuredPath || DEFAULT_NOTES_PATH);
}
