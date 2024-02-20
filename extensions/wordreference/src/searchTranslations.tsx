import {
  Action,
  ActionPanel,
  Icon,
  LaunchProps,
  List,
  openExtensionPreferences,
  updateCommandMetadata,
  useNavigation,
} from "@raycast/api";
import { Fragment, useEffect } from "react";
import useInitialValues from "./hooks/initialValues";
import usePreferences from "./hooks/preferences";
import { useRecentSearches, useSearchTranslations } from "./hooks/translations";
import PreferencesTranslationDropdown from "./preferencesTranslationDropdown";
import { WordTranslation } from "./translationDetails";

export default function Command(props: LaunchProps<{ arguments: Arguments.SearchTranslations }>) {
  const { word } = useInitialValues({ commandProps: props });
  const { preferences, translation } = usePreferences();
  const { searchText, setSearchText, data, isLoading } = useSearchTranslations({
    initialSearch: word,
  });
  const { clearRecentSearches, recentSearches, removeRecentSearch } = useRecentSearches();

  useEffect(() => {
    updateCommandMetadata({ subtitle: `Translate from ${translation.from} to ${translation.to}` });
  }, [translation]);

  useEffect(() => {
    if (word) {
      setSearchText(word);
    }
  }, [word]);

  return (
    <List
      onSearchTextChange={setSearchText}
      actions={
        <ActionPanel>
          <SettingsAction />
        </ActionPanel>
      }
      searchBarAccessory={<PreferencesTranslationDropdown />}
      filtering={false}
      isLoading={isLoading}
      searchBarPlaceholder={`Search ${translation.from} to ${translation.to} translations...`}
      searchText={searchText}
    >
      {searchText ? (
        <List.Section title="Results">
          {data?.map((translation, index) => (
            <List.Item
              key={index}
              title={translation.word}
              subtitle={translation.lang}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title={translation.word}>
                    <DetailActions
                      word={translation.word}
                      lang={translation.lang}
                      translationKey={preferences.translationKey}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <SettingsAction />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <List.Section title="Recent Searches">
          {recentSearches?.map(({ word, sourceLangKey, targetLangKey }, index) => (
            <List.Item
              key={index}
              title={word}
              subtitle={`${sourceLangKey} -> ${targetLangKey}`}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title={word}>
                    <DetailActions word={word} lang={sourceLangKey} translationKey={sourceLangKey + targetLangKey} />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Delete"
                      onAction={() => {
                        removeRecentSearch(index);
                      }}
                      icon={Icon.Trash}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      style={Action.Style.Destructive}
                    />
                    <Action
                      title="Clear Recent Searches"
                      onAction={() => {
                        clearRecentSearches();
                      }}
                      icon={Icon.Trash}
                      shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                      style={Action.Style.Destructive}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <SettingsAction />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function DetailActions({ word, lang, translationKey }: { word: string; lang: string; translationKey: string }) {
  const { addRecentSearch } = useRecentSearches();
  const navigation = useNavigation();
  const key = translationKey;
  const targetLangKey = key.replace(lang, "");
  const urlTranslationKey = lang + targetLangKey;
  const url = `https://www.wordreference.com/${urlTranslationKey}/${word}`;

  return (
    <Fragment>
      <Action
        title="Show Translation"
        onAction={() => {
          navigation.push(<WordTranslation word={word} lang={lang} baseUrl={urlTranslationKey} />);
          addRecentSearch({ word, sourceLangKey: lang, targetLangKey });
        }}
        icon={Icon.ChevronRight}
      />
      <Action.OpenInBrowser url={url} />
    </Fragment>
  );
}

function SettingsAction() {
  return (
    <Action
      title="Settings"
      onAction={openExtensionPreferences}
      shortcut={{ modifiers: ["ctrl"], key: "," }}
      icon={Icon.Gear}
    />
  );
}
