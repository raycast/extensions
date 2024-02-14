import { getPreferenceValues } from "@raycast/api";

type Preferences = {
  path: string;
  directory: string;
};

export const preferences = getPreferenceValues<Preferences>();

process.env.N_PREFIX = preferences.directory;

console.log(`preferences: ${JSON.stringify(preferences)}`);
