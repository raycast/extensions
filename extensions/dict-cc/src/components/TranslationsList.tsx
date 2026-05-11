import { useEffect, useState, useCallback } from "react";

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

  const fetchTranslations = useCallback(
    async (searchTerm: string) => {
      setSearchText(searchTerm);
      setLoading(true);

      try {
        const input = createInputFromSearchTerm(searchTerm);
        const { data, error, url } = await translate(input);

        if (error) {
          throw error;
        }

        setTranslations(data);
        setUrl(url);
        setLanguages([input.sourceLanguage, input.targetLanguage]);
      } catch (error) {
        if (error instanceof Error) {
          showToast({
            title: "Error",
            message: error.message,
          });
        }
      }

      setLoading(false);
    },
    [setTranslations, setUrl, setLanguages, setLoading],
  );

  useEffect(() => {
    if (isSearchFromClipboard) {
      (async () => {
        const clipboardText = await Clipboard.readText();

        if (clipboardText && clipboardText !== searchText) {
          fetchTranslations(clipboardText);
        }
      })();
    }
    if (isSearchFromSelection) {
      (async () => {
        const selectedText = await getSelectedText();

        if (selectedText && selectedText !== searchText) {
          fetchTranslations(selectedText);
        }
      })();
    }
  }, [isSearchFromClipboard, isSearchFromSelection, fetchTranslations, searchText]);

  return (
    <List
      isLoading={loading}
      searchText={searchText}
      onSearchTextChange={(text) => fetchTranslations(text)}
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
