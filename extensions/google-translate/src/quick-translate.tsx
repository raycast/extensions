import { List } from "@raycast/api";
import { ReactElement, useState } from "react";
import { LanguageDropdown } from "./QuickTranslate/LanguageDropdown";
import { QuickTranslateListItem } from "./QuickTranslate/QuickTranslateListItem";
import { useDebouncedValue, usePreferences, useSourceLanguage, useTargetLanguages, useTextState } from "./hooks";
import { LanguageCode } from "./languages";

export default function QuickTranslate(): ReactElement {
  const [sourceLanguage] = useSourceLanguage();
  const [targetLanguages] = useTargetLanguages();
  const { proxy } = usePreferences();
  const [isShowingDetail, setIsShowingDetail] = useState(true);
  const [text, setText] = useTextState();
  const debouncedText = useDebouncedValue(text, 500).trim();

  const [loadingStates, setLoadingStates] = useState(new Map(targetLanguages.map((lang) => [lang, false])));

  const isAnyLoading = Array.from(loadingStates.values()).some((isLoading) => isLoading);

  function setIsLoading(lang: LanguageCode, isLoading: boolean) {
    setLoadingStates((prev) => new Map(prev).set(lang, isLoading));
  }

  return (
    <List
      searchBarPlaceholder="Enter text to translate"
      searchText={text}
      onSearchTextChange={setText}
      isLoading={isAnyLoading}
      isShowingDetail={isShowingDetail}
      searchBarAccessory={<LanguageDropdown />}
    >
      {debouncedText
        ? targetLanguages.map((targetLanguage) => (
            <QuickTranslateListItem
              key={targetLanguage}
              debouncedText={debouncedText}
              languageSet={{ langFrom: sourceLanguage, langTo: [targetLanguage], proxy }}
              isShowingDetail={isShowingDetail}
              setIsShowingDetail={setIsShowingDetail}
              setIsLoading={(isLoading) => setIsLoading(targetLanguage, isLoading)}
            />
          ))
        : null}
    </List>
  );
}
