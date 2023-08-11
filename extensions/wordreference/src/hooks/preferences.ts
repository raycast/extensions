import { getPreferenceValues } from "@raycast/api";
import translationKeyMap from "../data/translationKeyMap.json";

interface Preferences {
  translationKey: string;
}

export default function usePreferences() {
  const preferences = getPreferenceValues<Preferences>();

  const translationKey = preferences?.translationKey as keyof typeof translationKeyMap || "enfr";
  const translation = translationKeyMap[translationKey];

  return {
    preferences,
    translation
  }
}