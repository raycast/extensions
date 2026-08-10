import { getPreferenceValues } from "@raycast/api";
import { MovieDb } from "moviedb-promise";

const preferences = getPreferenceValues();

export const moviedb = new MovieDb(preferences.apiKey);
