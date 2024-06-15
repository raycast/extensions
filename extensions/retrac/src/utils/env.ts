import { getPreferenceValues } from "@raycast/api";

export const apiKey = getPreferenceValues<Preferences>().apiKey;

export const projectSlug = getPreferenceValues<Preferences>().projectSlug;