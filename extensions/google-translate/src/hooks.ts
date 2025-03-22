import { getPreferenceValues, getSelectedText } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import React from "react";
import { LanguageCode } from "./languages";
import { LanguageCodeSet, TranslatePreferences } from "./types";
import { AUTO_DETECT } from "./simple-translate";

type _LegacySingleLanguageCodeSet = {
  langFrom: LanguageCode;
  langTo: LanguageCode;
};

type _StoredLanguageCodeSet = _LegacySingleLanguageCodeSet | LanguageCodeSet;

const unifyLegacyLanguageSet = (legacy: _StoredLanguageCodeSet): LanguageCodeSet => {
  return {
    langFrom: legacy.langFrom,
    langTo: Array.isArray(legacy.langTo) ? legacy.langTo : [legacy.langTo],
  };
};

export const usePreferences = () => {
  return React.useMemo(() => getPreferenceValues<TranslatePreferences>(), []);
};

export const useTextState = () => {
  const preferences = usePreferences();
  const [text, setText] = React.useState("");
  const textRef = React.useRef(text);
  textRef.current = text;

  React.useEffect(() => {
    if (preferences.autoInput) {
      getSelectedText()
        .then((cbText) => {
          if (!textRef.current) {
            setText(cbText ?? "");
          }
        })
        .catch((err) => {
          console.log("Error:", err);
        });
    }
  }, []);

  return [text, setText] as const;
};

export const useSelectedLanguagesSet = () => {
  const preferences = usePreferences();
  const [selectedLanguageSet, setSelectedLanguageSet] = useCachedState<_StoredLanguageCodeSet>(
    "selectedLanguageSet",
    unifyLegacyLanguageSet({
      langFrom: preferences.lang1,
      langTo: preferences.lang2,
    }),
  );

  return [unifyLegacyLanguageSet(selectedLanguageSet), setSelectedLanguageSet] as const;
};

export const usePreferencesLanguageSet = () => {
  const preferences = usePreferences();
  const preferencesLanguageSet: LanguageCodeSet = { langFrom: preferences.lang1, langTo: [preferences.lang2] };
  return preferencesLanguageSet;
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

export const useAllLanguageSets = () => {
  const [languages, setLanguages] = useCachedState<_StoredLanguageCodeSet[]>("languages", []);

  return [languages.map(unifyLegacyLanguageSet), setLanguages] as const;
};

export const useSourceLanguage = () => {
  const [sourceLanguage, setSourceLanguage] = useCachedState<LanguageCode>("sourceLanguage", AUTO_DETECT);

  return [sourceLanguage, setSourceLanguage] as const;
};

export const useTargetLanguages = () => {
  const preferences = usePreferences();
  const [targetLanguages, setTargetLanguages] = useCachedState<LanguageCode[]>(
    "targetLanguages",
    [preferences.lang1, preferences.lang2].filter((lang) => lang !== AUTO_DETECT),
  );

  return [targetLanguages, setTargetLanguages] as const;
};
