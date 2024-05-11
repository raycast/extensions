import React, { ReactElement, useState } from "react";
import { List, showToast, Toast, Action, Icon, ActionPanel } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useDebouncedValue, useSelectedLanguagesSet, useTextState } from "./hooks";
import { getLanguageFlag, supportedLanguagesByCode } from "./languages";
import { LanguageManagerListDropdown } from "./LanguagesManager";
import { doubleWayTranslate, playTTS } from "./simple-translate";
import { ConfigurableCopyPasteActions, OpenOnGoogleTranslateWebsiteAction, ToggleFullTextAction } from "./actions";

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
          <React.Fragment key={index}>
            <List.Item
              title={r.translatedText}
              accessories={[{ text: languages, tooltip: tooltip }]}
              detail={<List.Item.Detail markdown={r.translatedText} />}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <ConfigurableCopyPasteActions defaultActionsPrefix="Translation" value={r.translatedText} />
                    <ToggleFullTextAction onAction={() => setIsShowingDetail(!isShowingDetail)} />
                    <Action
                      title="Play Text-To-Speech"
                      icon={Icon.Play}
                      shortcut={{ modifiers: ["cmd"], key: "t" }}
                      onAction={() => playTTS(r.translatedText, r.langTo)}
                    />
                    <OpenOnGoogleTranslateWebsiteAction translationText={debouncedValue} translation={r} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
            {r.pronunciationText && (
              <List.Item
                title={r.pronunciationText}
                accessories={[{ text: languages, tooltip: tooltip }]}
                detail={<List.Item.Detail markdown={r.pronunciationText} />}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <ConfigurableCopyPasteActions value={r.pronunciationText} />
                      <ToggleFullTextAction onAction={() => setIsShowingDetail(!isShowingDetail)} />
                      <OpenOnGoogleTranslateWebsiteAction translationText={debouncedValue} translation={r} />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            )}
          </React.Fragment>
        );
      })}
    </List>
  );
}
