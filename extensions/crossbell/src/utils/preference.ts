import { getPreferenceValues } from "@raycast/api";

export function getPreference() {
  return getPreferenceValues<Preferences>();
}

type Preferences = {
  characterHandle: string;
};
