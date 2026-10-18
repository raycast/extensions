import { Action, ActionPanel, Icon, Keyboard, List, type LaunchProps } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { fetchThesaurus, thesaurusPageUrl, type ThesaurusEntry, type ThesaurusResult } from "./api";
import { copyText, EntryDetail } from "./detail";

export default function Command(props: LaunchProps) {
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  const query = searchText.trim();

  const { isLoading, data, error } = useCachedPromise(
    async (word: string, revision: string) => {
      void revision;
      return fetchThesaurus(word);
    },
    [query, "parts-of-speech"],
    {
      execute: query.length > 0,
      keepPreviousData: true,
      failureToastOptions: { title: "Thesaurus Search Failed" },
    },
  );

  const result: ThesaurusResult | undefined = query ? data : undefined;
  const isShowingDetail = result?.kind === "suggestions" || (result?.kind === "entries" && result.entries.length > 0);

  return (
    <List
      isLoading={query.length > 0 && isLoading}
      isShowingDetail={isShowingDetail}
      filtering={false}
      throttle
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search a word"
    >
      <ListContents query={query} result={result} isLoading={isLoading} error={error} onSearch={setSearchText} />
    </List>
  );
}

function ListContents({
  query,
  result,
  isLoading,
  error,
  onSearch,
}: {
  query: string;
  result: ThesaurusResult | undefined;
  isLoading: boolean;
  error: Error | undefined;
  onSearch: (word: string) => void;
}) {
  if (!query) {
    return (
      <List.EmptyView
        icon="icon.png"
        title="Search the Thesaurus"
        description="Type a word to see synonyms and antonyms."
      />
    );
  }

  if (result?.kind === "entries" && result.entries.length > 0) {
    return (
      <List.Section title={result.searched || query} subtitle={sectionSubtitle(result)}>
        {result.entries.map((entry) => (
          <EntryItem key={entry.id} entry={entry} />
        ))}
      </List.Section>
    );
  }

  if (result?.kind === "suggestions") {
    return (
      <List.Section title="Suggestions" subtitle={result.searched || query}>
        {result.suggestions.map((suggestion) => (
          <SuggestionItem
            key={suggestion}
            suggestion={suggestion}
            query={result.searched || query}
            onSearch={onSearch}
          />
        ))}
      </List.Section>
    );
  }

  if (isLoading && !result) {
    return <List.EmptyView icon={Icon.MagnifyingGlass} title="Searching…" />;
  }

  if (error && !result) {
    return (
      <List.EmptyView icon={Icon.ExclamationMark} title="Couldn't Search the Thesaurus" description={error.message} />
    );
  }

  if (!isLoading && result?.kind === "entries") {
    return <List.EmptyView icon={Icon.MagnifyingGlass} title="No Results" description={`No entry for “${query}”.`} />;
  }

  return null;
}

function sectionSubtitle(result: Extract<ThesaurusResult, { kind: "entries" }>): string {
  if (result.match === "related") {
    return "Related entries";
  }

  const words = new Set(result.entries.map((entry) => entry.word.toLocaleLowerCase()));
  if (words.size > 1) {
    return result.entries.length === 1 ? "1 entry" : `${result.entries.length} entries`;
  }

  return result.entries.length === 1 ? "1 sense" : `${result.entries.length} senses`;
}

function EntryItem({ entry }: { entry: ThesaurusEntry }) {
  const subtitle = [entry.partOfSpeech, entry.definitions[0]].filter(Boolean).join(" · ");

  return (
    <List.Item
      id={entry.id}
      title={entry.word}
      subtitle={subtitle}
      detail={<EntryDetail entry={entry} />}
      actions={<EntryActions entry={entry} />}
    />
  );
}

function EntryActions({ entry }: { entry: ThesaurusEntry }) {
  return (
    <ActionPanel>
      <Action.CopyToClipboard title="Copy Word" content={entry.word} />
      {entry.synonyms.length > 0 && (
        <Action.CopyToClipboard title="Copy Synonyms" content={entry.synonyms.join(", ")} />
      )}
      {entry.antonyms.length > 0 && (
        <Action.CopyToClipboard title="Copy Antonyms" content={entry.antonyms.join(", ")} />
      )}
      <Action.OpenInBrowser
        title="Open in Browser"
        url={thesaurusPageUrl(entry.word)}
        shortcut={Keyboard.Shortcut.Common.Open}
      />
    </ActionPanel>
  );
}

function SuggestionItem({
  suggestion,
  query,
  onSearch,
}: {
  suggestion: string;
  query: string;
  onSearch: (word: string) => void;
}) {
  return (
    <List.Item
      id={suggestion}
      title={suggestion}
      subtitle="Suggestion"
      icon={Icon.QuestionMark}
      detail={
        <List.Item.Detail
          markdown={`# ${suggestion}\n\nNo thesaurus entry for **${query}**.\n\nSearch this suggestion instead.`}
        />
      }
      actions={
        <ActionPanel>
          <Action title="Search Suggestion" icon={Icon.MagnifyingGlass} onAction={() => onSearch(suggestion)} />
          <Action
            title="Copy Suggestion"
            icon={Icon.Clipboard}
            onAction={() => {
              void copyText(suggestion);
            }}
          />
        </ActionPanel>
      }
    />
  );
}
