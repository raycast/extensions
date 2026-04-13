import { List, Icon, showToast, Toast, getPreferenceValues, ActionPanel, Action } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState, useEffect } from "react";
import { fetchAntonyms } from "./utils/cnrtl";
import { formatSynonymItems, formatSynonymPlainText } from "./utils/format";
import { addToHistory, getRecentWords } from "./utils/history";
import { buildCnrtlUrl, MIN_SEARCH_LENGTH } from "./utils/constants";
import { isCnrtlError } from "./utils/cnrtl";
import { WordActions } from "./components/WordActions";

export default function AntonymsCommand() {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const historySize = parseInt(preferences.historySize ?? "50", 10);

  const [searchText, setSearchText] = useState("");
  const [recentWords, setRecentWords] = useState<string[]>([]);

  useEffect(() => {
    getRecentWords(10)
      .then(setRecentWords)
      .catch(() => undefined);
  }, []);

  const trimmedWord = searchText.trim().toLowerCase();
  const shouldFetch = trimmedWord.length >= MIN_SEARCH_LENGTH;

  const { data, isLoading, error } = useCachedPromise(fetchAntonyms, [trimmedWord], {
    execute: shouldFetch,
    keepPreviousData: true,
    onError(err) {
      if (isCnrtlError(err) && err.type === "not_found") return;
      showToast({ style: Toast.Style.Failure, title: "Erreur réseau", message: err.message });
    },
  });

  useEffect(() => {
    if (data && trimmedWord) {
      addToHistory(data.word, "antonymie", historySize).catch(() => undefined);
    }
  }, [data, trimmedWord, historySize]);

  const notFound = isCnrtlError(error) && error.type === "not_found";
  const items = data ? formatSynonymItems(data) : [];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Entrez un mot pour trouver ses antonymes…"
      onSearchTextChange={setSearchText}
      throttle
    >
      {!shouldFetch && (
        <List.EmptyView
          icon={{ source: Icon.ArrowsExpand }}
          title="Antonymes — CNRTL"
          description="Tapez au moins 2 lettres pour rechercher les contraires d'un mot."
        />
      )}

      {shouldFetch && !isLoading && (notFound || (items.length === 0 && !error)) && (
        <List.Item
          icon={Icon.XMarkCircle}
          title={`Aucun antonyme pour « ${trimmedWord} »`}
          subtitle="Essayez avec une autre forme du mot"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Ouvrir Sur Le Cnrtl" url={buildCnrtlUrl("antonymie", trimmedWord)} />
            </ActionPanel>
          }
        />
      )}

      {data && items.length > 0 && (
        <>
          <List.Item
            icon={Icon.ArrowsExpand}
            title={`${items.length} antonyme${items.length > 1 ? "s" : ""} pour « ${data.word} »`}
            accessories={[{ text: `${items.length}` }]}
            actions={
              <WordActions word={data.word} currentEndpoint="antonymie" copyContent={formatSynonymPlainText(data)} />
            }
          />

          <List.Section title="Antonymes">
            {items.map((item) => (
              <List.Item
                key={item.word}
                icon={Icon.Text}
                title={item.title}
                subtitle={item.subtitle || item.accessory}
                accessories={[{ icon: Icon.ArrowRight }]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      title={`Antonymes de « ${item.word} »`}
                      url={item.url}
                      icon={Icon.ArrowsExpand}
                    />
                    <Action.OpenInBrowser
                      title={`Définition de « ${item.word} »`}
                      url={buildCnrtlUrl("definition", item.word)}
                      icon={Icon.Book}
                    />
                    <Action.CopyToClipboard
                      title="Copier Le Mot"
                      content={item.word}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.OpenInBrowser
                      title="Voir Tous Les Antonymes Sur Le Cnrtl"
                      url={buildCnrtlUrl("antonymie", data.word)}
                      icon={Icon.Globe}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}

      {!shouldFetch && recentWords.length > 0 && (
        <List.Section title="Recherches récentes">
          {recentWords.map((word) => (
            <List.Item
              key={word}
              icon={Icon.Clock}
              title={word}
              actions={<WordActions word={word} currentEndpoint="antonymie" />}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
