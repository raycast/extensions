import { List, Toast, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ReactElement, useState } from "react";
import { LanguageDropdown } from "./QuickTranslate/LanguageDropdown";
import { QuickTranslateListItem } from "./QuickTranslate/QuickTranslateListItem";
import { useDebouncedValue, useSourceLanguage, useTargetLanguages, useTextState } from "./hooks";
import { LanguageCode, supportedLanguagesByCode } from "./languages";
import { SimpleTranslateResult, simpleTranslate } from "./simple-translate";

export default function QuickTranslate(): ReactElement {
  const [sourceLanguage] = useSourceLanguage();
  const [targetLanguages] = useTargetLanguages();
  const [isShowingDetail, setIsShowingDetail] = useState(true);
  const [text, setText] = useTextState();
  const debouncedText = useDebouncedValue(text, 500).trim();

  const translations = new Map<LanguageCode, { result: SimpleTranslateResult | undefined; isLoading: boolean }>();

  for (const targetLanguage of targetLanguages) {
    const { data: result, isLoading: isLoading } = usePromise(
      simpleTranslate,
      [debouncedText, { langFrom: sourceLanguage, langTo: targetLanguage }],
      {
        onError(error) {
          showToast({
            style: Toast.Style.Failure,
            title: `Could not translate to ${supportedLanguagesByCode[targetLanguage].name}`,
            message: error.toString(),
          });
        },
      },
    );

    translations.set(targetLanguage, { result, isLoading });
  }

  const isAnyLoading = Array.from(translations.values()).some((v) => v.isLoading);

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
              languageSet={{ langFrom: sourceLanguage, langTo: targetLanguage }}
              isShowingDetail={isShowingDetail}
              setIsShowingDetail={setIsShowingDetail}
              result={translations.get(targetLanguage)?.result}
              isLoading={translations.get(targetLanguage)?.isLoading ?? false}
            />
          ))
        : null}
    </List>
  );
}
