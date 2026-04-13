import { Detail, List, Icon, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState, useEffect } from "react";
import { fetchDefinition } from "./utils/cnrtl";
import { formatDefinitionMarkdown, formatDefinitionPlainText, formatErrorMarkdown } from "./utils/format";
import { addToHistory, getRecentWords } from "./utils/history";
import { buildCnrtlUrl, MIN_SEARCH_LENGTH } from "./utils/constants";
import { isCnrtlError } from "./utils/cnrtl";
import { WordActions } from "./components/WordActions";
import type { ExtensionPreferences } from "./utils/types";

export default function DefinitionCommand(): JSX.Element {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const historySize = parseInt(preferences.historySize ?? "50", 10);

  const [searchText, setSearchText] = useState("");
  const [recentWords, setRecentWords] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "detail">("list");

  // Load recent words on mount
  useEffect(() => {
    getRecentWords(10).then(setRecentWords).catch(() => undefined);
  }, []);

  const trimmedWord = searchText.trim().toLowerCase();
  const shouldFetch = trimmedWord.length >= MIN_SEARCH_LENGTH;

  const { data, isLoading, error } = useCachedPromise(
    fetchDefinition,
    [trimmedWord],
    {
      execute: shouldFetch,
      keepPreviousData: true,
      onError(err) {
        if (isCnrtlError(err) && err.type === "not_found") return; // shown inline
        showToast({
          style: Toast.Style.Failure,
          title: "Erreur réseau",
          message: err.message,
        });
      },
    }
  );

  // Record in history when we get a successful result
  useEffect(() => {
    if (data && trimmedWord) {
      addToHistory(data.word, "definition", historySize).catch(() => undefined);
      setRecentWords((prev) => {
        const deduped = [data.word, ...prev.filter((w) => w !== data.word)];
        return deduped.slice(0, 10);
      });
    }
  }, [data, trimmedWord, historySize]);

  // ── Detail view (keyboard shortcut D) ────────────────────────────────────
  if (viewMode === "detail" && data) {
    const markdown = formatDefinitionMarkdown(data);
    return (
      <Detail
        markdown={markdown}
        navigationTitle={`Définition · ${data.word}`}
        actions={
          <WordActions
            word={data.word}
            currentEndpoint="definition"
            copyContent={formatDefinitionPlainText(data)}
          />
        }
        metadata={
          <Detail.Metadata>
            {data.partOfSpeech && (
              <Detail.Metadata.Label title="Catégorie" text={data.partOfSpeech} />
            )}
            {data.variants && data.variants.length > 0 && (
              <Detail.Metadata.Label title="Variantes" text={data.variants.join(", ")} />
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link
              title="Source"
              target={data.url}
              text="CNRTL · TLFi"
            />
          </Detail.Metadata>
        }
      />
    );
  }

  // ── List + inline detail panel (default) ─────────────────────────────────
  const notFound = isCnrtlError(error) && error.type === "not_found";
  const errorMarkdown = notFound
    ? formatErrorMarkdown(
        `Aucune entrée trouvée pour « ${trimmedWord} » dans le TLFi.`,
        trimmedWord,
        buildCnrtlUrl("definition", trimmedWord)
      )
    : error
    ? formatErrorMarkdown(error.message, trimmedWord, buildCnrtlUrl("definition", trimmedWord))
    : null;

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      searchBarPlaceholder="Entrez un mot pour le définir…"
      onSearchTextChange={setSearchText}
      throttle
    >
      {!shouldFetch && (
        <List.EmptyView
          icon={{ source: Icon.Book }}
          title="Définition — CNRTL"
          description="Tapez au moins 2 lettres pour rechercher dans le TLFi."
        />
      )}

      {shouldFetch && !isLoading && errorMarkdown && (
        <List.Item
          icon={Icon.XMarkCircle}
          title={`Aucun résultat pour « ${trimmedWord} »`}
          detail={<List.Item.Detail markdown={errorMarkdown} />}
          actions={
            <WordActions word={trimmedWord} currentEndpoint="definition" />
          }
        />
      )}

      {data && (
        <>
          {/* Main definition item */}
          <List.Item
            icon={Icon.Book}
            title={data.word}
            subtitle={data.partOfSpeech}
            detail={
              <List.Item.Detail
                markdown={formatDefinitionMarkdown(data)}
                metadata={
                  <List.Item.Detail.Metadata>
                    {data.partOfSpeech && (
                      <List.Item.Detail.Metadata.Label
                        title="Catégorie"
                        text={data.partOfSpeech}
                      />
                    )}
                    <List.Item.Detail.Metadata.Label
                      title="Sections"
                      text={String(data.sections.length)}
                    />
                    {data.variants && data.variants.length > 0 && (
                      <List.Item.Detail.Metadata.Label
                        title="Variantes"
                        text={data.variants.join(", ")}
                      />
                    )}
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Link
                      title="Source"
                      target={data.url}
                      text="CNRTL · TLFi"
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <WordActions
                word={data.word}
                currentEndpoint="definition"
                copyContent={formatDefinitionPlainText(data)}
              />
            }
          />

          {/* One item per definition section for quick glance */}
          {data.sections.map((section, i) => (
            <List.Item
              key={i}
              icon={Icon.Dot}
              title={`${section.label}. ${section.text.slice(0, 80)}${section.text.length > 80 ? "…" : ""}`}
              subtitle={section.qualifier}
              detail={
                <List.Item.Detail
                  markdown={`**${section.label}.** ${section.qualifier ? `*${section.qualifier}* ` : ""}${section.text}`}
                />
              }
              actions={
                <WordActions
                  word={data.word}
                  currentEndpoint="definition"
                  copyContent={`${section.label}. ${section.text}`}
                />
              }
            />
          ))}
        </>
      )}

      {/* Recent searches shown when idle */}
      {!shouldFetch && recentWords.length > 0 && (
        <List.Section title="Recherches récentes">
          {recentWords.map((word) => (
            <List.Item
              key={word}
              icon={Icon.Clock}
              title={word}
              actions={
                <WordActions word={word} currentEndpoint="definition" />
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
