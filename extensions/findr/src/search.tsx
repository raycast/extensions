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
import { SearchResponse, SearchResult } from "./types";
import {
  getFindrPath,
  getMaxResults,
  getFindrEnv,
  formatFileSize,
  formatRelativeDate,
  getFileIcon,
} from "./utils";
import { openBugReport } from "./bug-report";

export default function SearchFiles() {
  const [query, setQuery] = useState("");
  const findrPath = getFindrPath();
  const maxResults = getMaxResults();
  const findrEnv = getFindrEnv();
  const binaryExists = useMemo(() => existsSync(findrPath), [findrPath]);

  const { isLoading, data, error } = useExec(
    findrPath,
    ["search", query, "--json", "--limit", String(maxResults)],
    {
      env: findrEnv,
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

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Search failed",
        message: error.message,
      });
    }
  }, [error]);

  useEffect(() => {
    if (isIndexing) {
      showToast({
        style: Toast.Style.Animated,
        title: "Building index for the first time...",
        message: "This takes ~25 seconds. Search again shortly.",
      });
    }
  }, [isIndexing]);

  if (!binaryExists) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Findr Engine Not Found"
          description="The search engine binary is missing. Try reinstalling the extension."
          actions={
            <ActionPanel>
              <Action
                title="Report Bug"
                onAction={() => openBugReport("Findr engine binary not found")}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Something Went Wrong"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Report Bug with Diagnostics"
                onAction={() => openBugReport(error.message)}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const hasResults = results.length > 0;

  return (
    <List
      isLoading={isLoading && query.length > 0}
      isShowingDetail={hasResults}
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
              quickLook={{ path: result.path, name: result.filename }}
              detail={<ResultDetail result={result} />}
              actions={
                <ActionPanel>
                  <Action.Open title="Open File" target={result.path} />
                  <Action.ShowInFinder
                    path={result.path}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                  />
                  <Action.ToggleQuickLook
                    shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
                  />
                  <Action.CopyToClipboard
                    title="Copy Path"
                    content={result.path}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Filename"
                    content={result.filename}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                  />
                  <ActionPanel.Section>
                    <Action
                      title="Report Bug"
                      icon={Icon.Bug}
                      onAction={() => openBugReport()}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function ResultDetail({ result }: { result: SearchResult }) {
  let markdown = "";

  if (result.content_snippet) {
    const sanitized = result.content_snippet
      .replace(/[\\`*_{}[\]()#+\-.!]/g, "\\$&")
      .replace(/\n/g, "\n> ");
    markdown += `> ${sanitized}\n`;
  }

  return (
    <List.Item.Detail
      markdown={markdown || undefined}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Path" text={result.path} />
          <List.Item.Detail.Metadata.Separator />
          {result.file_type && (
            <List.Item.Detail.Metadata.Label
              title="Type"
              text={result.file_type.toUpperCase()}
            />
          )}
          {result.size_bytes && (
            <List.Item.Detail.Metadata.Label
              title="Size"
              text={formatFileSize(result.size_bytes)}
            />
          )}
          {result.modified && (
            <List.Item.Detail.Metadata.Label
              title="Modified"
              text={formatRelativeDate(result.modified)}
            />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
