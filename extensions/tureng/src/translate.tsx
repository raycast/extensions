import { ActionPanel, Action, List, LaunchProps } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import * as cheerio from "cheerio";

const URL = "https://tureng.com/en/turkish-english/";

function TranslationsListItem(props: { item: string; updateQuery: (term: string) => void }) {
  const searchForTranslation = () => {
    props.updateQuery(props.item);
  };

  return (
    <List.Item
      title={props.item}
      key={props.item}
      actions={
        <ActionPanel>
          <Action title="Search for This Entry" onAction={searchForTranslation} />
          <Action.CopyToClipboard title="Copy Translation" content={props.item} />
          <Action.OpenInBrowser title="Open in Browser" url={URL + encodeURIComponent(props.item)} />
        </ActionPanel>
      }
    />
  );
}

function AutocompleteListItem(props: { item: string; selectItem: (item: string) => void }) {
  return (
    <List.Item
      title={props.item}
      key={props.item}
      actions={
        <ActionPanel>
          <Action title="Search for This Item" onAction={() => props.selectItem(props.item)} />
        </ActionPanel>
      }
    />
  );
}

export default function Command(props: LaunchProps) {
  const [searchTerm, setSearchTerm] = useState(props.launchContext?.term || "");
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);

  // Determine what to fetch based on current state
  const shouldFetchTranslations = !!selectedTerm;
  const shouldFetchAutocomplete = !selectedTerm && searchTerm.length >= 3;

  // Fetch autocomplete results
  const { data: autocompleteResults, isLoading: isAutocompleteLoading } = useFetch<string[]>(
    `https://ac.tureng.co/?t=${encodeURIComponent(searchTerm)}&l=entr`,
    {
      parseResponse: async (response) => {
        const data = await response.json();
        return data as string[];
      },
      execute: shouldFetchAutocomplete,
    },
  );

  // Fetch translations for selected term
  const { data: translations, isLoading: isTranslationsLoading } = useFetch<string[]>(
    `https://tureng.com/en/turkish-english/${encodeURIComponent(selectedTerm || "")}`,
    {
      parseResponse: async (response) => {
        const html = await response.text();
        const $ = cheerio.load(html);
        const translations: string[] = [];

        $("#englishResultsTable tr").each((_, el) => {
          const elements = $(el).find("td[lang='en'] a, td[lang='tr'] a");
          if (elements.length === 0) return;

          elements.each((_, trEl) => {
            const text = $(trEl).text().trim();
            if (text.length > 0 && text !== selectedTerm) {
              translations.push(text);
            }
          });
        });

        return Array.from(new Set(translations)).slice(0, 3);
      },
      execute: shouldFetchTranslations,
    },
  );

  const updateQuery = (term: string) => {
    setSelectedTerm(term);
    setSearchTerm(term);
  };

  const updateSearchTerm = (text: string) => {
    setSearchTerm(text);
    setSelectedTerm(null);
  };

  const isLoading = isAutocompleteLoading || isTranslationsLoading;
  const data = shouldFetchTranslations ? translations || [] : [];
  const autocompleteData = shouldFetchAutocomplete ? autocompleteResults || [] : [];

  return (
    <List
      searchBarPlaceholder="Turkish or English"
      throttle
      isLoading={isLoading}
      searchText={searchTerm}
      onSearchTextChange={updateSearchTerm}
    >
      {data.length > 0 ? (
        <>
          {data.map((item) => (
            <TranslationsListItem item={item} updateQuery={updateQuery} key={item} />
          ))}
          <List.Item
            title={"More results at Tureng.com"}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  url={`https://tureng.com/en/turkish-english/${encodeURIComponent(selectedTerm || searchTerm)}`}
                ></Action.OpenInBrowser>
              </ActionPanel>
            }
          />
        </>
      ) : autocompleteData.length > 0 ? (
        autocompleteData.map((item, idx) => <AutocompleteListItem item={item} key={idx} selectItem={updateQuery} />)
      ) : searchTerm.length > 0 && searchTerm.length < 3 ? (
        <List.EmptyView title="Type at least 3 characters" description="Start typing to see autocomplete suggestions" />
      ) : (
        <List.EmptyView
          title="Search Tureng Dictionary"
          description="Type a Turkish or English word to get translations"
        />
      )}
    </List>
  );
}
