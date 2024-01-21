import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ReactElement, useState } from "react";
import { LanguageDropdown } from "./QuickTranslate/LanguageDropdown";
import { useDebouncedValue, useSourceLanguage, useTargetLanguages, useTextState } from "./hooks";
import { getLanguageFlag, supportedLanguagesByCode } from "./languages";
import { multiWayTranslate } from "./simple-translate";

export default function QuickTranslate(): ReactElement {
  const [sourceLanguage] = useSourceLanguage();
  const [targetLanguages] = useTargetLanguages();
  const [isShowingDetail, setIsShowingDetail] = useState(true);
  const [text, setText] = useTextState();
  const debouncedValue = useDebouncedValue(text, 500);
  const { data: results, isLoading: isLoading } = usePromise(
    multiWayTranslate,
    [debouncedValue, sourceLanguage, targetLanguages],
    {
      onError(error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Could not translate",
          message: error.toString(),
        });
      },
    },
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
      {results?.map((r, index) => {
        const langFrom = supportedLanguagesByCode[r.langFrom];
        const langTo = supportedLanguagesByCode[r.langTo];

        const languages = `${getLanguageFlag(langTo, langTo?.code)}`;
        const tooltip = `${langFrom?.name ?? langFrom?.code} -> ${langTo?.name ?? langTo?.code}`;

        return (
          <>
            <List.Item
              key={index}
              title={r.translatedText}
              accessories={[{ text: languages, tooltip: tooltip }]}
              detail={<List.Item.Detail markdown={r.translatedText} />}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.CopyToClipboard title="Copy" content={r.translatedText} />
                    <Action
                      title="Toggle Full Text"
                      icon={Icon.Text}
                      onAction={() => setIsShowingDetail(!isShowingDetail)}
                    />
                    <Action.OpenInBrowser
                      title="Open in Google Translate"
                      shortcut={{ modifiers: ["opt"], key: "enter" }}
                      url={
                        "https://translate.google.com/?sl=" +
                        r.langFrom +
                        "&tl=" +
                        r.langTo +
                        "&text=" +
                        encodeURIComponent(debouncedValue) +
                        "&op=translate"
                      }
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          </>
        );
      })}
    </List>
  );
}
