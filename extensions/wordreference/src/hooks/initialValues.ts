import { LaunchProps, Toast, getPreferenceValues, getSelectedText, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import availableTranslations from "../data/translationKeyMap.json";
import type { Preferences as CachedPreferences } from "./preferences";

interface Props {
  commandProps: LaunchProps<{ arguments: Arguments.SearchTranslations }>;
  preferences: CachedPreferences;
  setPreferences: (newPreferences: CachedPreferences) => Promise<void>;
}

export default function useInitialValues({ commandProps, preferences, setPreferences }: Props) {
  const language = commandProps.arguments.language;
  const [word, setWord] = useState<string | undefined>(commandProps.arguments.word);
  const raycastPreferences = getPreferenceValues<Preferences.SearchTranslations>();

  const loadSelectedText = async () => {
    try {
      let selectedText = (await getSelectedText()).trim();
      if (selectedText) {
        selectedText = selectedText.replace(/(\r\n|\n|\r)/gm, " ");
        setWord(selectedText);
      }
    } catch {
      // Continue regardless of error
    }
  };

  useEffect(() => {
    if (raycastPreferences.useSelectedText) {
      loadSelectedText();
    }
  }, []);

  useEffect(() => {
    if (language) {
      if (language in availableTranslations) {
        setPreferences({ ...preferences, translationKey: language });
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid language",
          message: "You need to set the key translation language (eg: 'fren' for French to English).",
        });
      }
    }
  }, [language, preferences]);

  return {
    word,
  };
}
