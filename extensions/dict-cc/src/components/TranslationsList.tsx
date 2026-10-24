import { useEffect, useState, useCallback, useRef } from "react";

import { Action, ActionPanel, Icon, List, showToast, Clipboard, getSelectedText } from "@raycast/api";

import translate, { Languages, Translations } from "dictcc";
import { createInputFromSearchTerm, getListSubtitle, joinStringsWithDelimiter, playAudio } from "../utils";

import { ListWithEmptyView } from "./ListWithEmptyView";

interface ITranslationsListProps {
  isSearchFromClipboard?: boolean;
  isSearchFromSelection?: boolean;
}

export function TranslationsList({ isSearchFromClipboard, isSearchFromSelection }: ITranslationsListProps) {
  const [translations, setTranslations] = useState<Translations[] | undefined>();
  const [url, setUrl] = useState<string | undefined>();
  const [languages, setLanguages] = useState<[/* source */ Languages, /* target */ Languages] | undefined>();
  const [loading, setLoading] = useState(false);

  const [searchText, setSearchText] = useState("");

  // Increments on every new query; replies from a superseded fetch are dropped, so clearing the
  // field (or typing on) while `translate` is still waiting cannot re-fill stale results.
  const fetchSequence = useRef(0);

  const fetchTranslations = useCallback(
    async (searchTerm: string) => {
      const sequence = ++fetchSequence.current;
      setSearchText(searchTerm);
      setLoading(true);

      try {
        const input = createInputFromSearchTerm(searchTerm);
        const { data, error, url } = await translate(input);

        if (sequence !== fetchSequence.current) return;

        if (error) {
          throw error;
        }
        setTranslations(data);
        setUrl(url);
        setLanguages([input.sourceLanguage, input.targetLanguage]);
      } catch (error) {
        if (sequence !== fetchSequence.current) return;
        if (error instanceof Error) {
          showToast({
            title: "Error",
            message: error.message,
          });
        }
      }

      if (sequence !== fetchSequence.current) return;
      setLoading(false);
    },
    [setTranslations, setUrl, setLanguages, setLoading],
  );

  // Prefill (clipboard/selection) runs once on mount: depending on `searchText` re-reads it on
  // every edit, so clearing the field resurrected the clipboard term in a loop.
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only prefill
  useEffect(() => {
    if (isSearchFromClipboard) {
      (async () => {
        const clipboardText = await Clipboard.readText();

        if (clipboardText) {
          fetchTranslations(clipboardText);
        }
      })();
    }
    if (isSearchFromSelection) {
      (async () => {
        const selectedText = await getSelectedText();

        if (selectedText) {
          fetchTranslations(selectedText);
        }
      })();
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only prefill
  }, []);

  return (
    <List
      isLoading={loading}
      searchText={searchText}
      onSearchTextChange={(text) => {
        if (text === "") {
          // Esc cleared the search bar: invalidate the in-flight fetch, then drop the query and
          // results in the same tick, so no later reply can resurrect the old term or results.
          fetchSequence.current++;
          setSearchText("");
          setTranslations([]);
          setLoading(false);
          return;
        }
        fetchTranslations(text);
      }}
      navigationTitle="Search dict.cc"
      searchBarPlaceholder="Search term (e.g. 'en de Home', or 'Home')"
      throttle
    >
      <ListWithEmptyView loading={loading} showNoResultsFound={!!searchText.length} />

      <List.Section title="Results" subtitle={getListSubtitle(loading, languages, translations?.length)}>
        {translations?.map((translation, index) => (
          <List.Item
            key={index}
            title={translation.targetTranslation.text}
            subtitle={translation.sourceTranslation.text}
            accessories={[
              { text: joinStringsWithDelimiter(translation.targetTranslation.meta.abbreviations) },
              { text: joinStringsWithDelimiter(translation.targetTranslation.meta.comments) },
              { text: joinStringsWithDelimiter(translation.targetTranslation.meta.wordClassDefinitions) },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Text"
                  content={translation.targetTranslation.text}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                />
                <Action
                  title="Play Audio"
                  icon={Icon.Play}
                  onAction={() => playAudio(translation.targetTranslationAudioUrl)}
                />
                {url && <Action.OpenInBrowser url={url} />}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
