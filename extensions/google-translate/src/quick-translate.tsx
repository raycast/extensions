import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ReactElement, useState } from "react";
import { LanguageDropdown } from "./QuickTranslate/LanguageDropdown";
import { QuickTranslateListItem } from "./QuickTranslate/QuickTranslateListItem";
import { useDebouncedValue, usePreferences, useSourceLanguage, useTargetLanguages, useTextState } from "./hooks";
import { multiTranslate } from "./simple-translate";

export default function QuickTranslate(): ReactElement {
  const [sourceLanguage] = useSourceLanguage();
  const [targetLanguages] = useTargetLanguages();
  const { proxy } = usePreferences();
  const [isShowingDetail, setIsShowingDetail] = useState(true);
  const [text, setText] = useTextState();
  const debouncedText = useDebouncedValue(text, 500).trim();

  const { data: results, isLoading } = usePromise(
    async (txt, src, targets) => {
      if (!txt) return [];
      return await multiTranslate(txt, { langFrom: src, langTo: targets, proxy });
    },
    [debouncedText, sourceLanguage, targetLanguages],
  );

  return (
    <List
      searchBarPlaceholder="Enter text to translate"
      searchText={text}
      onSearchTextChange={setText}
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchBarAccessory={<LanguageDropdown />}
    >
      {debouncedText && results
        ? results.map((result) => (
            <QuickTranslateListItem
              key={result.langTo}
              debouncedText={debouncedText}
              result={result}
              isShowingDetail={isShowingDetail}
              setIsShowingDetail={setIsShowingDetail}
              originalSourceLanguage={sourceLanguage}
            />
          ))
        : null}
    </List>
  );
}
