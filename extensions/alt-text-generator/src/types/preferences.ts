import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  apiKey: string;
  prompt: string;
}

export const { apiKey, prompt } = getPreferenceValues<Preferences>();
