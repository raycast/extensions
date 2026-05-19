import {
  Action,
  ActionPanel,
  List,
  Icon,
  Keyboard,
  showToast,
  Toast,
} from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useState, useMemo, useEffect } from "react";
import { existsSync } from "fs";
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
  const binaryExists = useMemo(() => existsSync(findrPath), [findrPath]);

  const { isLoading, data, error } = useExec(
    findrPath,
    ["search", query, "--json", "--limit", String(maxResults)],
    {
      execute: query.length > 0 && binaryExists,
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
  const isIndexing = data?.mode === "indexing";

  // Show toast on error
  useEffect(() => {
    if (error && query.length > 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "Search failed",
        message: error.message,
      });
    }
  }, [error]);

  // Show toast when indexing starts
  useEffect(() => {
    if (isIndexing) {
      showToast({
        style: Toast.Style.Animated,
        title: "Building index for the first time...",
        message: "This takes ~25 seconds. Search again shortly.",
      });
    }
  }, [isIndexing]);

  // Binary not found
  if (!binaryExists) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Findr CLI not found"
          description={`Binary not found at: ${findrPath}\n\nInstall it:\n1. Install Rust: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh\n2. Run: cargo install --git https://github.com/Roderick111/findr.git\n\nThen update the binary path in extension preferences if needed.`}
        />
      </List>
    );
  }

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
      ) : isIndexing ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="Building index..."
          description="First run: indexing your files (~25 seconds). Search again in a moment."
        />
      ) : results.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="No results"
          description={`Nothing found for "${query}".`}
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
