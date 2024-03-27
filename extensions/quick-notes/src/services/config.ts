import { environment, getPreferenceValues } from "@raycast/api";

export const TODO_FILE_PATH = `${environment.supportPath}/quick-notes.json`;
export const TAGS_FILE_PATH = `${environment.supportPath}/tags.json`;

export const preferences = getPreferenceValues<Preferences>();
