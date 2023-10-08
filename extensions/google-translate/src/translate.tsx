import React, { ReactElement, useState } from "react";
import { List, ActionPanel, showToast, Toast, Action, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useDebouncedValue, useSelectedLanguagesSet, useTextState } from "./hooks";
import { getLanguageFlag, supportedLanguagesByCode } from "./languages";
import { LanguageManagerListDropdown } from "./LanguagesManager";
import { doubleWayTranslate } from "./simple-translate";

export default function Translate(): ReactElement {
  const [selectedLanguageSet] = useSelectedLanguagesSet();
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [text, setText] = useTextState();
  const debouncedValue = useDebouncedValue(text, 500);
  const { data: results, isLoading: isLoading } = usePromise(
    doubleWayTranslate,
    [debouncedValue, selectedLanguageSet],
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
      searchBarAccessory={<LanguageManagerListDropdown />}
    >
      {results?.map((r, index) => {
        const langFrom = supportedLanguagesByCode[r.langFrom];
        const langTo = supportedLanguagesByCode[r.langTo];

        const languages = `${getLanguageFlag(langFrom, langFrom?.code)} -> ${getLanguageFlag(langTo, langTo?.code)}`;
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
            {r.pronunciationText && (
              <List.Item
                key={index}
                title={r.pronunciationText}
                accessories={[{ text: languages, tooltip: tooltip }]}
                detail={<List.Item.Detail markdown={r.pronunciationText} />}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action.CopyToClipboard title="Copy" content={r.pronunciationText} />
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
            )}
          </>
        );
      })}
    </List>
  );
}
