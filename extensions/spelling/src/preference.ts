import { getPreferenceValues } from "@raycast/api";

type Preference = {
  apiKey: string;
  url: string;
  model: string;
};

export function getPreference(): Preference {
  return getPreferenceValues<Preference>();
}
