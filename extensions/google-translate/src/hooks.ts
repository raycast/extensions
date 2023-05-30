import React from "react";
import { getPreferenceValues, getSelectedText } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { LanguageCodeSet, TranslatePreferences } from "./types";

export const usePreferences = () => {
  return React.useMemo(() => getPreferenceValues<TranslatePreferences>(), []);
};

export const useTextState = () => {
  const [text, setText] = React.useState("");
  const textRef = React.useRef(text);
  textRef.current = text;

  React.useEffect(() => {
    getSelectedText()
      .then((cbText) => {
        if (!textRef.current) {
          setText(cbText ?? "");
        }
      })
      .catch((err) => {
        console.log("Error:", err);
      });
  }, []);

  return [text, setText] as const;
};

export const useSelectedLanguagesSet = () => {
  const preferences = usePreferences();
  const [selectedLanguageSet, setSelectedLanguageSet] = useCachedState<LanguageCodeSet>("selectedLanguageSet", {
    langFrom: preferences.lang1,
    langTo: preferences.lang2,
  });

  return [selectedLanguageSet, setSelectedLanguageSet] as const;
};

export const usePreferencesLanguageSet = () => {
  const preferences = usePreferences();
  const preferencesLanguageSet: LanguageCodeSet = { langFrom: preferences.lang1, langTo: preferences.lang2 };
  return preferencesLanguageSet;
};

export const isSameLanguageSet = (langSet1: LanguageCodeSet, langSet2: LanguageCodeSet) => {
  return langSet1.langFrom === langSet2.langFrom && langSet1.langTo === langSet2.langTo;
};

export const useDebouncedValue = <T>(value: T, delay: number) => {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};
