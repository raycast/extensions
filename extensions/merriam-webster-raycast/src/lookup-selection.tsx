import { Action, ActionPanel, Detail, getSelectedText, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { buildLearnerBrowseUrl, fetchLearnerResults, normalizeLookupTerm } from "./api/merriamWebster";
import { formatEntriesMarkdown } from "./lib/formatEntry";
import { playAudioUrl } from "./lib/audio";
import { SearchResult } from "./types";

export default function LookupSelectionCommand() {
  const [term, setTerm] = useState<string>();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const fetchedTermRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    getSelectedText()
      .then((text) => {
        if (cancelled) return;
        const normalized = normalizeLookupTerm(text);
        if (!normalized) {
          if (!fetchedTermRef.current) {
            showToast({ style: Toast.Style.Failure, title: "No text selected" });
          }
          return;
        }
        if (normalized !== fetchedTermRef.current) {
          fetchedTermRef.current = normalized;
          setResults([]);
          setError(undefined);
          setIsLoading(true);
          setTerm(normalized);
        }
      })
      .catch(() => {
        if (!fetchedTermRef.current) {
          showToast({ style: Toast.Style.Failure, title: "Could not read selection" });
        }
      });

    return () => {
      cancelled = true;
    };
  });

  useEffect(() => {
    if (!term) return;

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

  const markdown = error
    ? `## Lookup Failed\n\n${error}`
    : isLoading
      ? `Looking up "${term}"...`
      : term
        ? `## No results\n\nNo learner entry found for "${term}".`
        : "## No text selected";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        term ? (
          <ActionPanel>
            <Action.OpenInBrowser title="Open in Merriam-Webster" url={buildLearnerBrowseUrl(term)} />
          </ActionPanel>
        ) : null
      }
    />
  );
}
