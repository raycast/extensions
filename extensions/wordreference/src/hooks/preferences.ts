import { Toast, showToast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import translationKeyMap from "../data/translationKeyMap.json";

export interface Preferences {
  translationKey: string;
}

const defaultPreferences: Preferences = {
  translationKey: "enfr",
};

export default function usePreferences() {
  const [preferences, setPreferences] = useCachedState<Preferences>("preferences", defaultPreferences);

  const _setPreferences = async (newPreferences: Preferences) => {
    setPreferences(newPreferences);
    showToast({
      title: "Saving preferences...",
      style: Toast.Style.Animated,
    });
    showToast({
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
