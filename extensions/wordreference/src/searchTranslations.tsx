import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  LocalStorage,
  Toast,
  confirmAlert,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { Fragment, useEffect, useMemo, useState } from "react";
import { WordTranslation } from "./translationDetails";
import usePreferences from "./hooks/preferences";

export default function Command() {
  const { preferences, translation } = usePreferences();
  const { searchText, setSearchText, translations, isLoading } = useSearchTranslations();

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
          {translations.map((translation, index) => (
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

function useSearchTranslations() {
  const [searchText, setSearchText] = useState("");
  const { preferences } = usePreferences();

  const { data, isLoading } = useFetch<string>(
    `https://www.wordreference.com/autocomplete?dict=${preferences.translationKey}&query=${searchText}`,
    {
      method: "GET",
      keepPreviousData: true,
    }
  );

  const translations = useMemo(() => {
    if (!data) {
      return [];
    }

    const lines = data.split("\n");
    const result = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const [word, lang] = line.split("\t");
      result.push({ word, lang });
    }

    return result;
  }, [data]);

  return { searchText, setSearchText, translations, isLoading };
}

interface RecentSearch {
  word: string;
  lang: string;
  translationKey: string;
}

function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useCachedState<
    { word: string; lang: string; translationKey: string }[] | undefined
  >("recentSearches", undefined);

  async function loadRecentSearches() {
    const recentSearchesString = await LocalStorage.getItem<string>("recentSearches");
    if (recentSearchesString) {
      setRecentSearches(JSON.parse(recentSearchesString));
    } else {
      setRecentSearches([]);
    }
  }

  async function saveRecentSearches(searches: RecentSearch[]) {
    await LocalStorage.setItem("recentSearches", JSON.stringify(searches));
  }

  const addRecentSearch = ({ word, lang, translationKey }: { word: string; lang: string; translationKey: string }) => {
    const newRecentSearches =
      recentSearches?.filter((recentSearch) => recentSearch.word !== word || recentSearch.lang !== lang) || [];
    newRecentSearches.unshift({ word, lang, translationKey });
    setRecentSearches(newRecentSearches);
    saveRecentSearches(newRecentSearches);
  };

  const removeRecentSearch = (index: number) => {
    const newRecentSearches = recentSearches ? [...recentSearches] : [];
    newRecentSearches.splice(index, 1);
    setRecentSearches(newRecentSearches);
    showToast({ title: "Successfully deleted", style: Toast.Style.Success });
    saveRecentSearches(newRecentSearches);
  };

  const clearRecentSearches = async () => {
    await confirmAlert({
      title: "Clear Recent Searches",
      message: "Are you sure you want to clear all recent searches?",
      icon: { source: Icon.Trash, tintColor: Color.Red },
      primaryAction: {
        title: "Clear",
        onAction: () => {
          setRecentSearches([]);
          saveRecentSearches([]);
          showToast({ title: "Successfully deleted", style: Toast.Style.Success });
        },
        style: Alert.ActionStyle.Destructive,
      },
    });
  };

  useEffect(() => {
    if (!recentSearches) loadRecentSearches();
  }, [recentSearches === undefined]);

  return { recentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches };
}
