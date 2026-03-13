import { LocalStorage, Toast, showToast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect } from "react";
import translationKeyMap from "../data/translationKeyMap.json";

interface Preferences {
  translationKey: string;
}

const defaultPreferences: Preferences = {
  translationKey: "enfr",
};

export default function usePreferences() {
  // This hook will be used in multiple places, so we need to make sure it's cached, and to load the data only once
  const [preferences, setPreferences] = useCachedState<Preferences | undefined>("preferences", defaultPreferences);
  const [shouldShowPreferences, setShouldShowPreferences] = useCachedState<boolean>("shouldShowPreferences", false);

  const _setPreferences = async (newPreferences: Preferences) => {
    setPreferences(newPreferences);
    setShouldShowPreferences(false);
    return savePreferences(newPreferences);
  };

  async function loadPreferences() {
    const loadedPreferences = await LocalStorage.getItem<string>("preferences");
    if (loadedPreferences) {
      setPreferences(JSON.parse(loadedPreferences));
      setShouldShowPreferences(false);
    } else {
      setShouldShowPreferences(true);
    }
  }

  async function savePreferences(newPreferences?: Preferences) {
    showToast({
      title: "Saving preferences...",
      style: Toast.Style.Animated,
    });
    await LocalStorage.setItem("preferences", JSON.stringify(newPreferences));
    showToast({
      title: "Preferences saved",
      style: Toast.Style.Success,
    });
  }

  useEffect(() => {
    loadPreferences();
  }, [preferences === undefined]);

  const translationKey = (preferences?.translationKey ||
    defaultPreferences.translationKey) as keyof typeof translationKeyMap;
  const translation = translationKeyMap[translationKey];

  return {
    // Always return preferences if undefined, and fetch them inside the hook
    preferences: preferences || defaultPreferences,
    setPreferences: _setPreferences,
    shouldShowPreferences,
    loadPreferences,
    translation,
  };
}
