import { Action, ActionPanel, Detail, LaunchProps, List } from "@raycast/api";
import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import { buildLearnerBrowseUrl, fetchLearnerResults, normalizeLookupTerm } from "./api/merriamWebster";
import { formatEntriesMarkdown, formatEntriesPlainText } from "./lib/formatEntry";
import { playAudioUrl } from "./lib/audio";
import { SearchResult } from "./types";

type LookupLearnerArguments = {
  term: string;
};

const LookupList = List as unknown as ComponentType<any>;
const LookupListEmptyView = List.EmptyView as unknown as ComponentType<any>;
const LookupListItem = List.Item as unknown as ComponentType<any>;
const LookupDetail = Detail as unknown as ComponentType<any>;
const LookupActionPanel = ActionPanel as unknown as ComponentType<any>;
const LookupAction = Action as unknown as ComponentType<any>;
const LookupCopyToClipboardAction = Action.CopyToClipboard as unknown as ComponentType<any>;
const LookupOpenInBrowserAction = Action.OpenInBrowser as unknown as ComponentType<any>;

export default function LookupLearnerCommand(props: LaunchProps<{ arguments: LookupLearnerArguments }>) {
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
      <LookupDetail
        isLoading={isLoading}
        markdown={formatEntriesMarkdown(entries)}
        actions={
          <LookupActionPanel>
            {entries[0].audioUrl ? (
              <LookupAction title="Play Pronunciation" icon="🔊" onAction={() => playAudioUrl(entries[0].audioUrl!)} />
            ) : null}
            <LookupOpenInBrowserAction title="Open in Merriam-Webster" url={buildLearnerBrowseUrl(entries[0].headword)} />
          </LookupActionPanel>
        }
      />
    );
  }

  return (
    <LookupList isLoading={isLoading} searchBarPlaceholder={`Suggestions for ${term}`}>
      {error ? <LookupListEmptyView title="Lookup failed" description={error} /> : null}
      {!error && results.length === 0 ? (
        <LookupListEmptyView title="No learner entry found" description={`No results for "${term}".`} />
      ) : null}

      {results.map((result) =>
        result.kind === "suggestion" ? (
          <LookupListItem
            key={result.value}
            title={result.value}
            subtitle="Suggestion"
            actions={
              <LookupActionPanel>
                <LookupOpenInBrowserAction title="Open in Merriam-Webster" url={buildLearnerBrowseUrl(result.value)} />
                <LookupCopyToClipboardAction title="Copy Suggestion" content={result.value} />
              </LookupActionPanel>
            }
          />
        ) : null,
      )}
    </LookupList>
  );
}
