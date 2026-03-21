import { environment, getPreferenceValues } from "@raycast/api";
import path from "path";

export const TODO_FILE_PATH = path.join(environment.supportPath, "quick-notes.json");
export const TAGS_FILE_PATH = path.join(environment.supportPath, "tags.json");

export const preferences = getPreferenceValues<Preferences>();
