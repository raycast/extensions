import { Action, ActionPanel, Detail, getSelectedText, showToast, Toast } from "@raycast/api";
import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import { buildLearnerBrowseUrl, fetchLearnerResults, normalizeLookupTerm } from "./api/merriamWebster";
import { formatEntriesMarkdown, formatEntriesPlainText } from "./lib/formatEntry";
import { playAudioUrl } from "./lib/audio";
import { SearchResult } from "./types";

const SelectionDetail = Detail as unknown as ComponentType<any>;
const SelectionActionPanel = ActionPanel as unknown as ComponentType<any>;
const SelectionAction = Action as unknown as ComponentType<any>;
const SelectionCopyToClipboardAction = Action.CopyToClipboard as unknown as ComponentType<any>;
const SelectionOpenInBrowserAction = Action.OpenInBrowser as unknown as ComponentType<any>;

export default function LookupSelectionCommand() {
  const [term, setTerm] = useState<string>();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    getSelectedText()
      .then((text) => {
        const normalized = normalizeLookupTerm(text);
        if (!normalized) {
          showToast({ style: Toast.Style.Failure, title: "No text selected" });
          return;
        }
        setTerm(normalized);
      })
      .catch(() => {
        showToast({ style: Toast.Style.Failure, title: "Could not read selection" });
      });
  }, []);

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
      <SelectionDetail
        isLoading={isLoading}
        markdown={formatEntriesMarkdown(entries)}
        actions={
          <SelectionActionPanel>
            {entries[0].audioUrl ? (
              <SelectionAction title="Play Pronunciation" icon="🔊" onAction={() => playAudioUrl(entries[0].audioUrl!)} />
            ) : null}
            <SelectionOpenInBrowserAction title="Open in Merriam-Webster" url={buildLearnerBrowseUrl(entries[0].headword)} />
          </SelectionActionPanel>
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
    <SelectionDetail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        term ? (
          <SelectionActionPanel>
            <SelectionOpenInBrowserAction title="Open in Merriam-Webster" url={buildLearnerBrowseUrl(term)} />
          </SelectionActionPanel>
        ) : null
      }
    />
  );
}
