import { Toast, showToast } from "@raycast/api";
import translationKeyMap from "../data/translationKeyMap.json";
import { useMigratedCachedState } from "./migrateCachedState";

export interface Preferences {
  translationKey: string;
}

const defaultPreferences: Preferences = {
  translationKey: "enfr",
};

export default function usePreferences() {
  const [preferences, setPreferences] = useMigratedCachedState<Preferences>("preferences", defaultPreferences);

  const _setPreferences = async (newPreferences: Preferences) => {
    setPreferences(newPreferences);
    await showToast({
      title: "Preferences saved",
      style: Toast.Style.Success,
    });
  };

  const translationKey = preferences.translationKey as keyof typeof translationKeyMap;
  const translation = translationKeyMap[translationKey];

  return {
    preferences,
    setPreferences: _setPreferences,
    translation,
  };
}
