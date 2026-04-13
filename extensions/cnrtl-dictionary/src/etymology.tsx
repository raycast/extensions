import { Detail, List, Icon, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState, useEffect } from "react";
import { fetchEtymology } from "./utils/cnrtl";
import { formatEtymologyMarkdown, formatErrorMarkdown } from "./utils/format";
import { addToHistory, getRecentWords } from "./utils/history";
import { buildCnrtlUrl, MIN_SEARCH_LENGTH } from "./utils/constants";
import { isCnrtlError } from "./utils/cnrtl";
import { WordActions } from "./components/WordActions";

export default function EtymologyCommand() {
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

  const { data, isLoading, error } = useCachedPromise(fetchEtymology, [trimmedWord], {
    execute: shouldFetch,
    keepPreviousData: true,
    onError(err) {
      if (isCnrtlError(err) && err.type === "not_found") return;
      showToast({ style: Toast.Style.Failure, title: "Erreur réseau", message: err.message });
    },
  });

  useEffect(() => {
    if (data && trimmedWord) {
      addToHistory(trimmedWord, "etymologie", historySize).catch(() => undefined);
    }
  }, [data, trimmedWord, historySize]);

  // ── Error state ───────────────────────────────────────────────────────────
  const notFound = isCnrtlError(error) && error.type === "not_found";
  if (shouldFetch && !isLoading && (notFound || error)) {
    const url = buildCnrtlUrl("etymologie", trimmedWord);
    const markdown = formatErrorMarkdown(
      notFound
        ? `Aucune étymologie trouvée pour « ${trimmedWord} » dans le CNRTL.`
        : (error?.message ?? "Une erreur s'est produite."),
      trimmedWord,
      url
    );
    return (
      <Detail
        markdown={markdown}
        navigationTitle={`Étymologie · ${trimmedWord}`}
        actions={<WordActions word={trimmedWord} currentEndpoint="etymologie" />}
      />
    );
  }

  // ── Result ────────────────────────────────────────────────────────────────
  if (data && shouldFetch) {
    const markdown = formatEtymologyMarkdown(data, trimmedWord);
    return (
      <Detail
        isLoading={isLoading}
        markdown={markdown}
        navigationTitle={`Étymologie · ${trimmedWord}`}
        actions={<WordActions word={trimmedWord} currentEndpoint="etymologie" copyContent={data.content} />}
        metadata={
          <Detail.Metadata>
            {data.period && <Detail.Metadata.Label title="Période" text={data.period} />}
            {data.origin && <Detail.Metadata.Label title="Langue d'origine" text={data.origin} />}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link title="Source" target={data.url} text="CNRTL · Etymologie" />
          </Detail.Metadata>
        }
      />
    );
  }

  // ── Idle / loading ────────────────────────────────────────────────────────
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Entrez un mot pour son étymologie…"
      onSearchTextChange={setSearchText}
      throttle
    >
      <List.EmptyView
        icon={{ source: Icon.Clock }}
        title="Étymologie — CNRTL"
        description="Tapez au moins 2 lettres pour rechercher l'étymologie d'un mot."
      />

      {!shouldFetch && recentWords.length > 0 && (
        <List.Section title="Recherches récentes">
          {recentWords.map((word) => (
            <List.Item
              key={word}
              icon={Icon.Clock}
              title={word}
              actions={<WordActions word={word} currentEndpoint="etymologie" />}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
