import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";

import { AuthenticateView } from "./components/authenticate-view";
import { NoteDetailScreen } from "./components/note-detail";
import { searchNotes } from "./lib/api";
import { deleteNoteWithConfirmation, deleteActionStyle } from "./lib/delete-note";
import { normalizeGetNoteError } from "./lib/errors";
import { recallPreviewMarkdown } from "./lib/format";
import { buildNoteBrowserUrl } from "./lib/note-url";
import { openNoteSourceInBrowser } from "./lib/open-note-source";
import { RecallResult } from "./lib/types";
import { useGetNoteCredentials } from "./hooks/use-getnote-credentials";

function dedupeRecallResults(results: RecallResult[]): RecallResult[] {
  const seen = new Set<string>();

  return results.filter((result) => {
    const title = result.title?.trim().toLowerCase() || "";
    const content = result.content?.trim().toLowerCase() || "";
    const key = result.note_id || `${result.note_type}::${title}::${content}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export default function SearchNotesCommand() {
  const { credentials, isLoading: isAuthLoading, reload } = useGetNoteCredentials();
  const [searchText, setSearchText] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RecallResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedSearchText = searchText.trim();
  const hasPendingSearch = trimmedSearchText !== query;

  function handleSearchTextChange(nextSearchText: string) {
    setSearchText(nextSearchText);

    if (!nextSearchText.trim()) {
      setQuery("");
      setResults([]);
      setError(null);
      setIsLoading(false);
    }
  }

  function submitSearch() {
    if (!trimmedSearchText) {
      setQuery("");
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setResults([]);
    setIsLoading(true);
    setQuery(trimmedSearchText);
    setError(null);
  }

  useEffect(() => {
    if (!credentials || !query) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const nextResults = await searchNotes(query, 8);
        if (!cancelled) {
          setResults(dedupeRecallResults(nextResults));
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(normalizeGetNoteError(nextError));
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [credentials, query]);

  if (isAuthLoading) {
    return <List isLoading searchBarPlaceholder="Checking GetNote connection..." />;
  }

  if (!credentials) {
    return <AuthenticateView onConnected={reload} />;
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      onSearchTextChange={handleSearchTextChange}
      searchText={searchText}
      searchBarPlaceholder="Enter a keyword or semantic query"
    >
      {!trimmedSearchText && !query && !isLoading ? (
        <List.EmptyView
          title="Start Searching"
          description="Enter a topic, phrase, or semantic query to recall related notes."
        />
      ) : null}
      {trimmedSearchText && hasPendingSearch && !isLoading ? (
        <List.EmptyView
          title="Press Enter to Search"
          description={`Search for "${trimmedSearchText}".`}
          actions={
            <ActionPanel>
              <Action title="Search" icon={Icon.MagnifyingGlass} onAction={submitSearch} />
            </ActionPanel>
          }
        />
      ) : null}
      {query && error ? <List.EmptyView title="Search Failed" description={error} /> : null}
      {query && !hasPendingSearch && !error && !isLoading && results.length === 0 ? (
        <List.EmptyView title="No Matching Notes" description={`No content matched "${query}".`} />
      ) : null}
      {!hasPendingSearch &&
        results.map((result, index) => (
          <List.Item
            key={`${result.note_id || "result"}-${index}`}
            title={result.title || "Untitled Result"}
            subtitle={result.note_type}
            accessories={result.created_at ? [{ text: result.created_at }] : []}
            detail={<List.Item.Detail markdown={recallPreviewMarkdown(result)} />}
            actions={
              <ActionPanel>
                {result.note_id ? (
                  <Action.Push
                    title="View Note Details"
                    icon={Icon.Sidebar}
                    target={<NoteDetailScreen noteId={result.note_id} />}
                  />
                ) : null}
                {result.note_id ? (
                  <Action.OpenInBrowser
                    title="Open in Browser"
                    icon={Icon.Globe}
                    url={buildNoteBrowserUrl(result.note_id)}
                  />
                ) : null}
                {result.note_id && result.note_type?.toLowerCase() === "link" ? (
                  <Action
                    title="Open Source URL"
                    icon={Icon.Link}
                    onAction={() => openNoteSourceInBrowser(result.note_id!)}
                  />
                ) : null}
                {result.note_id ? (
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    style={deleteActionStyle}
                    onAction={async () => {
                      const deleted = await deleteNoteWithConfirmation(result.note_id!);

                      if (!deleted) {
                        return;
                      }

                      setResults((currentResults) =>
                        currentResults.filter((currentResult) => currentResult.note_id !== result.note_id),
                      );
                    }}
                  />
                ) : null}
                <Action.CopyToClipboard title="Copy Result Snippet" content={result.content || ""} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
