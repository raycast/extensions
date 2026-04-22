import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import { buildLearnerBrowseUrl, fetchLearnerResults, shouldSearchTerm } from "./api/merriamWebster";
import { formatEntryMarkdown, formatEntryPlainText } from "./lib/formatEntry";
import { playAudioUrl } from "./lib/audio";
import type { SearchResult } from "./types";

const SearchList = List as unknown as ComponentType<any>;
const SearchListEmptyView = List.EmptyView as unknown as ComponentType<any>;
const SearchListItem = List.Item as unknown as ComponentType<any>;
const SearchListItemDetail = List.Item.Detail as unknown as ComponentType<any>;
const SearchActionPanel = ActionPanel as unknown as ComponentType<any>;
const SearchAction = Action as unknown as ComponentType<any>;
const SearchCopyToClipboardAction = Action.CopyToClipboard as unknown as ComponentType<any>;
const SearchOpenInBrowserAction = Action.OpenInBrowser as unknown as ComponentType<any>;

export default function SearchLearnerCommand() {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    const term = searchText.trim();

    async function run() {
      if (!shouldSearchTerm(term)) {
        setIsLoading(false);
        setResults([]);
        setError(undefined);
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const nextResults = await fetchLearnerResults(term);
        if (!cancelled) setResults(nextResults);
      } catch (caught) {
        if (!cancelled) {
          const message = caught instanceof Error ? caught.message : "Unknown error";
          setResults([]);
          setError(message);
          await showToast({ style: Toast.Style.Failure, title: "Lookup failed", message });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [searchText]);

  return (
    <SearchList
      isLoading={isLoading}
      isShowingDetail
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Merriam-Webster Learner"
      throttle
    >
      {!shouldSearchTerm(searchText) ? (
        <SearchListEmptyView title="Type a word to search the Learner's Dictionary" />
      ) : null}

      {error ? <SearchListEmptyView title="Lookup failed" description={error} /> : null}

      {results.map((result) =>
        result.kind === "entry" ? (
          <SearchListItem
            key={result.id}
            icon={Icon.Book}
            title={result.headword}
            subtitle={result.partOfSpeech}
            detail={<SearchListItemDetail markdown={formatEntryMarkdown(result)} />}
            actions={
              <SearchActionPanel>
                {result.audioUrl ? (
                  <SearchAction title="Play Pronunciation" icon="🔊" onAction={() => playAudioUrl(result.audioUrl!)} />
                ) : null}
                <SearchOpenInBrowserAction title="Open in Merriam-Webster" url={buildLearnerBrowseUrl(result.headword)} />
              </SearchActionPanel>
            }
          />
        ) : (
          <SearchListItem
            key={result.value}
            icon={Icon.MagnifyingGlass}
            title={result.value}
            subtitle="Suggestion"
            actions={
              <SearchActionPanel>
                <SearchAction title="Search Suggestion" onAction={() => setSearchText(result.value)} />
              </SearchActionPanel>
            }
          />
        ),
      )}
    </SearchList>
  );
}
