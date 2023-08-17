import { Action, ActionPanel, Icon, List, openExtensionPreferences, useNavigation } from "@raycast/api";
import { Fragment } from "react";
import usePreferences from "./hooks/preferences";
import { WordTranslation } from "./translationDetails";
import { useRecentSearches, useSearchTranslations } from "./hooks/translations";

export default function Command() {
  const { preferences, translation } = usePreferences();
  const { searchText, setSearchText, data, isLoading } = useSearchTranslations();

  const { clearRecentSearches, recentSearches, removeRecentSearch } = useRecentSearches();

  return (
    <List
      onSearchTextChange={setSearchText}
      actions={
        <ActionPanel>
          <SettingsAction />
        </ActionPanel>
      }
      filtering={false}
      isLoading={isLoading}
      searchBarPlaceholder={`Search ${translation.from} to ${translation.to} translations...`}
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
          {recentSearches?.map(({ word, lang }, index) => (
            <List.Item
              key={index}
              title={word}
              subtitle={lang}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title={word}>
                    <DetailActions word={word} lang={lang} translationKey={preferences.translationKey} />
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
  const otherLang = key.replace(lang, "");
  const urlTranslationKey = lang + otherLang;
  const url = `https://www.wordreference.com/${urlTranslationKey}/${word}`;

  return (
    <Fragment>
      <Action
        title="Show Translation"
        onAction={() => {
          navigation.push(<WordTranslation word={word} lang={lang} baseUrl={urlTranslationKey} />);
          addRecentSearch({ word, lang, translationKey: urlTranslationKey });
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
