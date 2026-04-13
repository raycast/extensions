import { Detail, List, Icon, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState, useEffect } from "react";
import { fetchMorphology } from "./utils/cnrtl";
import { formatMorphologyMarkdown, formatErrorMarkdown } from "./utils/format";
import { addToHistory, getRecentWords } from "./utils/history";
import { buildCnrtlUrl, MIN_SEARCH_LENGTH } from "./utils/constants";
import { isCnrtlError } from "./utils/cnrtl";
import { WordActions } from "./components/WordActions";

export default function MorphologyCommand() {
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

  const { data, isLoading, error } = useCachedPromise(fetchMorphology, [trimmedWord], {
    execute: shouldFetch,
    keepPreviousData: true,
    onError(err) {
      if (isCnrtlError(err) && err.type === "not_found") return;
      showToast({ style: Toast.Style.Failure, title: "Erreur réseau", message: err.message });
    },
  });

  useEffect(() => {
    if (data && trimmedWord) {
      addToHistory(data.word, "morphologie", historySize).catch(() => undefined);
    }
  }, [data, trimmedWord, historySize]);

  const notFound = isCnrtlError(error) && error.type === "not_found";

  // ── Error state ───────────────────────────────────────────────────────────
  if (shouldFetch && !isLoading && (notFound || error)) {
    const url = buildCnrtlUrl("morphologie", trimmedWord);
    return (
      <Detail
        markdown={formatErrorMarkdown(
          notFound
            ? `Aucune forme morphologique pour « ${trimmedWord} ».`
            : (error?.message ?? "Une erreur s'est produite."),
          trimmedWord,
          url
        )}
        navigationTitle={`Morphologie · ${trimmedWord}`}
        actions={<WordActions word={trimmedWord} currentEndpoint="morphologie" />}
      />
    );
  }

  // ── Result ────────────────────────────────────────────────────────────────
  if (data && shouldFetch) {
    const markdown = formatMorphologyMarkdown(data);
    return (
      <Detail
        isLoading={isLoading}
        markdown={markdown}
        navigationTitle={`Morphologie · ${data.word}`}
        actions={
          <WordActions
            word={data.word}
            currentEndpoint="morphologie"
            copyContent={data.forms.map((f) => `${f.label}: ${f.form}`).join("\n")}
          />
        }
        metadata={
          <Detail.Metadata>
            {data.category && <Detail.Metadata.Label title="Catégorie" text={data.category} />}
            <Detail.Metadata.Label title="Formes" text={String(data.forms.length)} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link title="Source" target={data.url} text="CNRTL · Morphologie" />
          </Detail.Metadata>
        }
      />
    );
  }

  // ── Idle / loading ────────────────────────────────────────────────────────
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Entrez un mot pour sa morphologie…"
      onSearchTextChange={setSearchText}
      throttle
    >
      <List.EmptyView
        icon={{ source: Icon.List }}
        title="Morphologie — CNRTL"
        description="Tapez au moins 2 lettres pour voir les formes fléchies d'un mot."
      />

      {!shouldFetch && recentWords.length > 0 && (
        <List.Section title="Recherches récentes">
          {recentWords.map((word) => (
            <List.Item
              key={word}
              icon={Icon.Clock}
              title={word}
              actions={<WordActions word={word} currentEndpoint="morphologie" />}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
