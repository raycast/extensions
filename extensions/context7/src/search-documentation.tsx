import { Action, ActionPanel, Icon, LaunchProps, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

import { searchContext } from "./lib/context7";
import { isAbortError, toErrorMessage } from "./lib/error-utils";
import type { ContextSnippet } from "./lib/types";

const SEARCH_DEBOUNCE_MS = 250;

type SearchContextProps = LaunchProps<{ arguments: Arguments.SearchDocumentation }>;

export default function SearchDocumentationCommand(props: SearchContextProps) {
  return <SearchDocumentationView libraryId={props.arguments.libraryId} />;
}

export function SearchDocumentationView(props: { libraryId?: string }) {
  const { libraryId = "" } = props;
  const libraryLabel = formatLibraryLabel(libraryId);
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<ContextSnippet[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!libraryId) {
      return;
    }

    const trimmedSearchText = searchText.trim();

    if (!trimmedSearchText) {
      setResults([]);
      setErrorMessage(undefined);
      setIsLoading(false);
      return;
    }

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      void (async () => {
        setIsLoading(true);
        setErrorMessage(undefined);

        try {
          const snippets = await searchContext(libraryId, trimmedSearchText, abortController.signal);
          setResults(snippets);
        } catch (error) {
          if (isAbortError(error)) {
            return;
          }

          setResults([]);
          const message = toErrorMessage(error);
          setErrorMessage(message);
          await showToast({
            style: Toast.Style.Failure,
            title: "Search failed",
            message,
          });
        } finally {
          setIsLoading(false);
        }
      })();
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      abortController.abort();
      clearTimeout(timeoutId);
    };
  }, [libraryId, searchText]);

  if (!libraryId) {
    return (
      <List>
        <List.EmptyView
          title="Library Required"
          description="Launch this command from Search Libraries or from a Quicklink created for a specific library ID."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle={`Search Documentation: ${libraryLabel}`}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={`Search ${libraryLabel} documentation...`}
    >
      <List.EmptyView
        title={getEmptyTitle(searchText, errorMessage)}
        description={getEmptyDescription(libraryLabel, errorMessage)}
      />

      {results.map((snippet, index) => {
        const sourceUrl = normalizeSourceUrl(snippet.source);
        const snippetTitle = snippet.title || `Snippet ${index + 1}`;

        return (
          <List.Item
            key={`${snippetTitle}-${index}`}
            title={snippetTitle}
            subtitle={undefined}
            icon={Icon.Document}
            detail={<List.Item.Detail markdown={renderSnippetMarkdown(snippet)} />}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy to Clipboard" content={renderSnippetMarkdown(snippet)} />
                <Action.Paste
                  content={renderSnippetMarkdown(snippet)}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                />
                {sourceUrl ? (
                  <Action.OpenInBrowser
                    title="Open in Browser"
                    url={sourceUrl}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
                  />
                ) : null}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function renderSnippetMarkdown(snippet: ContextSnippet) {
  return [`# ${snippet.title || "Snippet"}`, "", snippet.content.trim()].join("\n");
}

function normalizeSourceUrl(source?: string) {
  if (!source) {
    return undefined;
  }

  if (source.startsWith("http://") || source.startsWith("https://")) {
    return source;
  }

  if (source.startsWith("/")) {
    return `https://context7.com${source}`;
  }

  return `https://${source}`;
}

function getEmptyTitle(searchText: string, errorMessage?: string) {
  if (errorMessage) {
    return "Could Not Load Documentation";
  }

  if (!searchText.trim()) {
    return "Search Documentation";
  }

  return "No Snippets Found";
}

function getEmptyDescription(libraryName: string, errorMessage?: string) {
  if (errorMessage) {
    return errorMessage;
  }

  return `Type a query to search ${libraryName} documentation snippets.`;
}

function formatLibraryLabel(libraryId: string) {
  const segments = libraryId.split("/").filter(Boolean);
  const rawLabel = segments.at(-1) ?? libraryId;

  return rawLabel.replace(/[._-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}
