import { Action, ActionPanel, List, Icon, Keyboard } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useState, useMemo } from "react";
import { SearchResponse } from "./types";
import {
  getFindrPath,
  getMaxResults,
  formatFileSize,
  formatRelativeDate,
  getFileIcon,
} from "./utils";

export default function SearchFiles() {
  const [query, setQuery] = useState("");
  const findrPath = getFindrPath();
  const maxResults = getMaxResults();

  const { isLoading, data } = useExec(
    findrPath,
    ["search", query, "--json", "--limit", String(maxResults)],
    {
      execute: query.length > 0,
      keepPreviousData: true,
      parseOutput: ({ stdout }) => {
        try {
          return JSON.parse(stdout) as SearchResponse;
        } catch {
          return null;
        }
      },
    },
  );

  const results = useMemo(() => data?.results || [], [data]);
  const elapsed = data?.elapsed_ms ?? 0;

  return (
    <List
      isLoading={isLoading && query.length > 0}
      searchBarPlaceholder="Search files and contents... (e.g. 'revolut', 'resume pdf')"
      onSearchTextChange={setQuery}
      throttle
    >
      {query.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Type to search"
          description="Searches filenames and file contents. Append a type to filter (e.g. 'invoice pdf')"
        />
      ) : results.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="No results"
          description={`Nothing found for "${query}". Try 'findr index init' to rebuild the index.`}
        />
      ) : (
        <List.Section
          title={`${results.length} results`}
          subtitle={`${elapsed}ms`}
        >
          {results.map((result, index) => (
            <List.Item
              key={`${result.path}-${index}`}
              icon={getFileIcon(result.file_type)}
              title={result.filename}
              subtitle={
                result.content_snippet
                  ? truncate(result.content_snippet, 60)
                  : truncatePath(result.path, result.filename)
              }
              accessories={[
                { text: formatFileSize(result.size_bytes) },
                { text: formatRelativeDate(result.modified) },
                { tag: result.file_type || "?" },
              ]}
              actions={
                <ActionPanel>
                  <Action.Open title="Open File" target={result.path} />
                  <Action.ShowInFinder path={result.path} />
                  <Action.CopyToClipboard
                    title="Copy Path"
                    content={result.path}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                  <Action.CopyToClipboard
                    title="Copy Filename"
                    content={result.filename}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "...";
}

function truncatePath(path: string, filename: string): string {
  return path.replace(filename, "").replace(/\/$/, "");
}
