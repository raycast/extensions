import { List, Icon, getPreferenceValues, showToast, Toast, ActionPanel, Action } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState, useEffect } from "react";
import { fetchSynonyms } from "./utils/cnrtl";
import { formatSynonymItems, formatSynonymPlainText } from "./utils/format";
import { addToHistory, getRecentWords } from "./utils/history";
import { buildCnrtlUrl, MIN_SEARCH_LENGTH } from "./utils/constants";
import { isCnrtlError } from "./utils/cnrtl";
import { WordActions } from "./components/WordActions";
import type { ExtensionPreferences } from "./utils/types";

export default function SynonymsCommand(): JSX.Element {
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

  const { data, isLoading, error } = useCachedPromise(fetchSynonyms, [trimmedWord], {
    execute: shouldFetch,
    keepPreviousData: true,
    onError(err) {
      if (isCnrtlError(err) && err.type === "not_found") return;
      showToast({ style: Toast.Style.Failure, title: "Erreur réseau", message: err.message });
    },
  });

  useEffect(() => {
    if (data && trimmedWord) {
      addToHistory(data.word, "synonymie", historySize).catch(() => undefined);
    }
  }, [data, trimmedWord, historySize]);

  const notFound = isCnrtlError(error) && error.type === "not_found";
  const items = data ? formatSynonymItems(data) : [];

  // Group items by degree for display
  const byDegree = items.reduce<Record<string, typeof items>>((acc, item) => {
    const key = item.subtitle || "Autres";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Entrez un mot pour trouver ses synonymes…"
      onSearchTextChange={setSearchText}
      throttle
    >
      {!shouldFetch && (
        <List.EmptyView
          icon={{ source: Icon.Switch }}
          title="Synonymes — CNRTL"
          description="Tapez au moins 2 lettres pour rechercher des synonymes."
        />
      )}

      {shouldFetch && !isLoading && (notFound || (items.length === 0 && !error)) && (
        <List.Item
          icon={Icon.XMarkCircle}
          title={`Aucun synonyme pour « ${trimmedWord} »`}
          subtitle="Essayez avec une autre forme du mot"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Ouvrir sur le CNRTL" url={buildCnrtlUrl("synonymie", trimmedWord)} />
            </ActionPanel>
          }
        />
      )}

      {data && items.length > 0 && (
        <>
          {/* Summary item */}
          <List.Item
            icon={Icon.Switch}
            title={`${items.length} synonyme${items.length > 1 ? "s" : ""} pour « ${data.word} »`}
            accessories={[{ text: `${items.length}` }]}
            actions={
              <WordActions word={data.word} currentEndpoint="synonymie" copyContent={formatSynonymPlainText(data)} />
            }
          />

          {/* Grouped by degree */}
          {Object.entries(byDegree).map(([degreeLabel, degreeItems]) => (
            <List.Section key={degreeLabel} title={degreeLabel || "Synonymes"}>
              {degreeItems.map((item) => (
                <List.Item
                  key={item.word}
                  icon={Icon.Text}
                  title={item.title}
                  subtitle={item.accessory}
                  accessories={[{ icon: Icon.ArrowRight }]}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser title={`Synonymes de « ${item.word} »`} url={item.url} icon={Icon.Switch} />
                      <Action.OpenInBrowser
                        title={`Définition de « ${item.word} »`}
                        url={buildCnrtlUrl("definition", item.word)}
                        icon={Icon.Book}
                      />
                      <Action.CopyToClipboard
                        title="Copier le mot"
                        content={item.word}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                      <Action.OpenInBrowser
                        title="Voir tous les synonymes sur le CNRTL"
                        url={buildCnrtlUrl("synonymie", data.word)}
                        icon={Icon.Globe}
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          ))}
        </>
      )}

      {!shouldFetch && recentWords.length > 0 && (
        <List.Section title="Recherches récentes">
          {recentWords.map((word) => (
            <List.Item
              key={word}
              icon={Icon.Clock}
              title={word}
              actions={<WordActions word={word} currentEndpoint="synonymie" />}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
