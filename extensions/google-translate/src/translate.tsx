import React, { ReactElement, useState } from "react";
import { List, showToast, Toast, Action, Icon, ActionPanel } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  useAllLanguageSets,
  useDebouncedValue,
  usePreferences,
  usePreferencesLanguageSet,
  useSelectedLanguagesSet,
  useTextState,
} from "./hooks";
import { supportedLanguagesByCode } from "./languages";
import { LanguageManagerListDropdown } from "./LanguagesManager";
import { doubleWayTranslate, simpleTranslate, playTTS } from "./simple-translate";
import { ConfigurableCopyPasteActions, OpenOnGoogleTranslateWebsiteAction, ToggleFullTextAction } from "./actions";
import { LanguageCodeSet } from "./types";

const QuickLanguageSetShifterActions = () => {
  const [selectedLanguageSet, setSelectedLanguageSet] = useSelectedLanguagesSet();
  const preferencesLanguageSet = usePreferencesLanguageSet();
  const [languages] = useAllLanguageSets();
  const allLanguages = React.useMemo(() => [preferencesLanguageSet, ...languages], [preferencesLanguageSet, languages]);
  const selectedLanguageSetIndex = React.useMemo(
    () => allLanguages.findIndex((langSet) => JSON.stringify(langSet) === JSON.stringify(selectedLanguageSet)),
    [allLanguages, selectedLanguageSet],
  );

  return (
    <ActionPanel.Section title="Language Set">
      <Action
        title="Go to previous Language Set"
        icon={Icon.ArrowUp}
        shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
        onAction={() => {
          if (selectedLanguageSetIndex <= 0) {
            setSelectedLanguageSet(allLanguages[allLanguages.length - 1]);
          } else {
            setSelectedLanguageSet(allLanguages[selectedLanguageSetIndex - 1]);
          }
        }}
      />
      <Action
        title="Go to next Language Set"
        icon={Icon.ArrowDown}
        shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
        onAction={() => {
          if (selectedLanguageSetIndex >= allLanguages.length - 1) {
            setSelectedLanguageSet(allLanguages[0]);
          } else {
            setSelectedLanguageSet(allLanguages[selectedLanguageSetIndex + 1]);
          }
        }}
      />
    </ActionPanel.Section>
  );
};
const DoubleWayTranslateItem: React.FC<{
  value: string;
  selectedLanguageSet: LanguageCodeSet;
  toggleShowingDetail: () => void;
}> = ({ toggleShowingDetail, value, selectedLanguageSet }) => {
  const { data: results, isLoading } = usePromise(doubleWayTranslate, [value, selectedLanguageSet], {
    onError(error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Could not translate",
        message: error.toString(),
      });
    },
  });

  if (isLoading) {
    return <List.EmptyView icon={Icon.Hourglass} title="Translating..." />;
  }

  return (
    <>
      {results?.map((r, index) => {
        const langFrom = supportedLanguagesByCode[r.langFrom];
        const langTo = supportedLanguagesByCode[r.langTo];
        const languages = `${langFrom.name} -> ${langTo.name}`;
        const tooltip = `${langFrom?.name} -> ${langTo?.name}`;
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
                    <ToggleFullTextAction onAction={() => toggleShowingDetail()} />
                    <Action
                      title="Play Text-To-Speech"
                      icon={Icon.Play}
                      shortcut={{ modifiers: ["cmd"], key: "t" }}
                      onAction={() => playTTS(r.translatedText, r.langTo)}
                    />
                    <OpenOnGoogleTranslateWebsiteAction translationText={value} translation={r} />
                  </ActionPanel.Section>
                  <QuickLanguageSetShifterActions />
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
                      <ToggleFullTextAction onAction={() => toggleShowingDetail()} />
                      <OpenOnGoogleTranslateWebsiteAction translationText={value} translation={r} />
                    </ActionPanel.Section>
                    <QuickLanguageSetShifterActions />
                  </ActionPanel>
                }
              />
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};

const TranslateItem: React.FC<{
  value: string;
  selectedLanguageSet: LanguageCodeSet;
  toggleShowingDetail: () => void;
}> = ({ toggleShowingDetail, value, selectedLanguageSet }) => {
  const { data: result, isLoading } = usePromise(simpleTranslate, [value, selectedLanguageSet], {
    onError(error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Could not translate",
        message: error.toString(),
      });
    },
  });

  const langFromCode = result?.langFrom ?? selectedLanguageSet.langFrom;
  const langToCode = result?.langTo ?? selectedLanguageSet.langTo[0];

  const langFrom = supportedLanguagesByCode[langFromCode];
  const langTo = supportedLanguagesByCode[langToCode];
  const languages = `${langFrom.name} -> ${langTo.name}`;
  const tooltip = `${langFrom?.name} -> ${langTo?.name}`;

  return (
    <List.Item
      title={result?.translatedText ?? ""}
      subtitle={isLoading ? "Translating..." : undefined}
      accessories={[{ text: languages, tooltip: tooltip }]}
      detail={<List.Item.Detail markdown={result?.translatedText ?? ""} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <ConfigurableCopyPasteActions defaultActionsPrefix="Translation" value={result?.translatedText ?? ""} />
            <ToggleFullTextAction onAction={() => toggleShowingDetail()} />
            {result && (
              <Action
                title="Play Text-To-Speech"
                icon={Icon.Play}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
                onAction={() => playTTS(result.translatedText, langToCode)}
              />
            )}
            {result && <OpenOnGoogleTranslateWebsiteAction translationText={value} translation={result} />}
          </ActionPanel.Section>
          <QuickLanguageSetShifterActions />
        </ActionPanel>
      }
    />
  );
};

export default function Translate(): ReactElement {
  const [selectedLanguageSet] = useSelectedLanguagesSet();
  const { proxy } = usePreferences();
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [text, setText] = useTextState();
  const debouncedValue = useDebouncedValue(text, 500);

  return (
    <List
      searchBarPlaceholder="Enter text to translate"
      searchText={text}
      onSearchTextChange={setText}
      isShowingDetail={isShowingDetail}
      searchBarAccessory={<LanguageManagerListDropdown />}
      actions={
        <ActionPanel>
          <QuickLanguageSetShifterActions />
        </ActionPanel>
      }
    >
      {selectedLanguageSet.langTo.length === 1 ? (
        <DoubleWayTranslateItem
          value={debouncedValue}
          selectedLanguageSet={{ langFrom: selectedLanguageSet.langFrom, langTo: selectedLanguageSet.langTo, proxy }}
          toggleShowingDetail={() => setIsShowingDetail(!isShowingDetail)}
        />
      ) : (
        selectedLanguageSet.langTo.map((langTo, index) => (
          <TranslateItem
            key={`${index} ${langTo}`}
            value={debouncedValue}
            selectedLanguageSet={{ langFrom: selectedLanguageSet.langFrom, langTo: [langTo], proxy }}
            toggleShowingDetail={() => setIsShowingDetail(!isShowingDetail)}
          />
        ))
      )}
    </List>
  );
}
