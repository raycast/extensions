import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { buildLearnerBrowseUrl, fetchLearnerResults, shouldSearchTerm } from "./api/merriamWebster";
import { formatEntryMarkdown } from "./lib/formatEntry";
import { playAudioUrl } from "./lib/audio";
import type { SearchResult } from "./types";

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
    <List
      isLoading={isLoading}
      isShowingDetail
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Merriam-Webster Learner"
      throttle
    >
      {!shouldSearchTerm(searchText) ? (
        <List.EmptyView title="Type a word to search the Learner's Dictionary" />
      ) : null}

      {error ? <List.EmptyView title="Lookup failed" description={error} /> : null}

      {results.map((result) =>
        result.kind === "entry" ? (
          <List.Item
            key={result.id}
            icon={Icon.Book}
            title={result.headword}
            subtitle={result.partOfSpeech}
            detail={<List.Item.Detail markdown={formatEntryMarkdown(result)} />}
            actions={
              <ActionPanel>
                {result.audioUrl ? (
                  <Action title="Play Pronunciation" icon="🔊" onAction={() => playAudioUrl(result.audioUrl!)} />
                ) : null}
                <Action.OpenInBrowser title="Open in Merriam-Webster" url={buildLearnerBrowseUrl(result.headword)} />
              </ActionPanel>
            }
          />
        ) : (
          <List.Item
            key={result.value}
            icon={Icon.MagnifyingGlass}
            title={result.value}
            subtitle="Suggestion"
            actions={
              <ActionPanel>
                <Action title="Search Suggestion" onAction={() => setSearchText(result.value)} />
              </ActionPanel>
            }
          />
        ),
      )}
    </List>
  );
}
