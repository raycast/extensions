import {
  Action,
  ActionPanel,
  Detail,
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
import { RecentSearch, useRecentSearches, useSearchTranslations } from "./hooks/translations";
import PreferencesTranslationDropdown from "./preferencesTranslationDropdown";
import {
  WordReferenceErrorResponse,
  getSearchErrorDescription,
  getSearchErrorMarkdown,
  getWordReferenceUrl,
} from "./wordreference";

export default function Command(props: LaunchProps<{ arguments: Arguments.SearchTranslations }>) {
  const { preferences, setPreferences, translation } = usePreferences();
  const { word } = useInitialValues({ commandProps: props, preferences, setPreferences });
  const { searchText, setSearchText, data, isLoading, errorResponse } = useSearchTranslations({
    initialSearch: word,
    translationKey: preferences.translationKey,
  });
  const { clearRecentSearches, recentSearches, removeRecentSearch, addRecentSearch } = useRecentSearches();
  const trimmedSearchText = searchText.trim();
  const searchUrl = getWordReferenceUrl(preferences.translationKey, trimmedSearchText);

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
      searchBarAccessory={<PreferencesTranslationDropdown preferences={preferences} setPreferences={setPreferences} />}
      filtering={false}
      isLoading={isLoading}
      searchBarPlaceholder={`Search ${translation.from} to ${translation.to} translations...`}
      searchText={searchText}
    >
      {searchText ? (
        <List.Section title="Results">
          {errorResponse ? (
            <List.Item
              title="Search unavailable"
              subtitle={getSearchErrorDescription(errorResponse.status, errorResponse.statusText)}
              icon={Icon.Warning}
              accessories={[{ text: `HTTP ${errorResponse.status}` }]}
              actions={
                <ActionPanel>
                  <SearchErrorActions errorResponse={errorResponse} searchText={trimmedSearchText} url={searchUrl} />
                  <SettingsAction />
                </ActionPanel>
              }
            />
          ) : null}
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
                      addRecentSearch={addRecentSearch}
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
          {recentSearches.map(({ word, sourceLangKey, targetLangKey }, index) => (
            <List.Item
              key={index}
              title={word}
              subtitle={`${sourceLangKey} -> ${targetLangKey}`}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title={word}>
                    <DetailActions
                      word={word}
                      lang={sourceLangKey}
                      translationKey={sourceLangKey + targetLangKey}
                      addRecentSearch={addRecentSearch}
                    />
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

function SearchErrorActions({
  errorResponse,
  searchText,
  url,
}: {
  errorResponse: WordReferenceErrorResponse;
  searchText: string;
  url: string;
}) {
  const navigation = useNavigation();

  return (
    <Action
      title="Show Error Details"
      icon={Icon.Warning}
      onAction={() => {
        navigation.push(<SearchErrorDetail errorResponse={errorResponse} searchText={searchText} url={url} />);
      }}
    />
  );
}

function SearchErrorDetail({
  errorResponse,
  searchText,
  url,
}: {
  errorResponse: WordReferenceErrorResponse;
  searchText: string;
  url: string;
}) {
  return (
    <Detail
      navigationTitle="Search unavailable"
      markdown={getSearchErrorMarkdown(errorResponse.status, errorResponse.statusText, searchText)}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={url} />
          <SettingsAction />
        </ActionPanel>
      }
    />
  );
}

function DetailActions({
  word,
  lang,
  translationKey,
  addRecentSearch,
}: {
  word: string;
  lang: string;
  translationKey: string;
  addRecentSearch: (search: RecentSearch) => void;
}) {
  const navigation = useNavigation();
  const key = translationKey;
  const targetLangKey = key.replace(lang, "");
  const urlTranslationKey = lang + targetLangKey;
  const url = getWordReferenceUrl(urlTranslationKey, word);

  return (
    <Fragment>
      <Action
        title="Show Translation"
        onAction={async () => {
          const { WordTranslation } = await import("./translationDetails");
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
