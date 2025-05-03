import { LaunchProps, Toast, getPreferenceValues, getSelectedText, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import availableTranslations from "../data/translationKeyMap.json";
import usePreferences from "./preferences";

interface Props {
  commandProps: LaunchProps<{ arguments: Arguments.SearchTranslations }>;
}

interface RaycastPreferenceValues {
  useSelectedText: boolean;
}

export default function useInitialValues({ commandProps }: Props) {
  const language = commandProps.arguments.language;
  const { setPreferences, preferences } = usePreferences();
  const [word, setWord] = useState<string | undefined>(commandProps.arguments.word);
  const raycastPreferences = getPreferenceValues<RaycastPreferenceValues>();

  const loadSelectedText = async () => {
    try {
      let selectedText = (await getSelectedText()).trim();
      if (selectedText) {
        selectedText = selectedText.replace(/(\r\n|\n|\r)/gm, " ");
        setWord(selectedText);
      }
    } catch (error) {
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
        showToast(
          Toast.Style.Failure,
          "Invalid language",
          "You need to set the key translation language (eg: 'fren' for French to English)."
        );
      }
    }
  }, [language, preferences]);

  return {
    word,
  };
}
