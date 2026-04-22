import { Action, ActionPanel, Detail, LaunchProps, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { buildLearnerBrowseUrl, fetchLearnerResults, normalizeLookupTerm } from "./api/merriamWebster";
import { formatEntriesMarkdown } from "./lib/formatEntry";
import { playAudioUrl } from "./lib/audio";
import { SearchResult } from "./types";

export default function LookupLearnerCommand(props: LaunchProps<{ arguments: Arguments.LookupLearner }>) {
  const term = normalizeLookupTerm(props.arguments.term);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;

    fetchLearnerResults(term)
      .then((nextResults) => {
        if (!cancelled) {
          setResults(nextResults);
          setError(undefined);
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setResults([]);
          setError(caught instanceof Error ? caught.message : "Unknown error");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [term]);

  const entries = results.filter((result): result is SearchResult & { kind: "entry" } => result.kind === "entry");

  if (entries.length > 0) {
    return (
      <Detail
        isLoading={isLoading}
        markdown={formatEntriesMarkdown(entries)}
        actions={
          <ActionPanel>
            {entries[0].audioUrl ? (
              <Action title="Play Pronunciation" icon="🔊" onAction={() => playAudioUrl(entries[0].audioUrl!)} />
            ) : null}
            <Action.OpenInBrowser title="Open in Merriam-Webster" url={buildLearnerBrowseUrl(entries[0].headword)} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder={`Suggestions for ${term}`}>
      {error ? <List.EmptyView title="Lookup failed" description={error} /> : null}
      {!error && results.length === 0 ? (
        <List.EmptyView title="No learner entry found" description={`No results for "${term}".`} />
      ) : null}

      {results.map((result) =>
        result.kind === "suggestion" ? (
          <List.Item
            key={result.value}
            title={result.value}
            subtitle="Suggestion"
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Merriam-Webster" url={buildLearnerBrowseUrl(result.value)} />
                <Action.CopyToClipboard title="Copy Suggestion" content={result.value} />
              </ActionPanel>
            }
          />
        ) : null,
      )}
    </List>
  );
}
