import {
  Action,
  ActionPanel,
  List,
  Icon,
  Keyboard,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useMemo, useEffect, useRef } from "react";
import { existsSync } from "fs";
import { execFile } from "child_process";
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

function getResultIcon(result: SearchResult): string {
  if (result.is_dir) return "📁";
  return getFileIcon(result.file_type);
}

function ResultActions({ result }: { result: SearchResult }) {
  if (result.is_dir) {
    return (
      <ActionPanel>
        <Action.ShowInFinder path={result.path} title="Open in Finder" />
        <Action.Open title="Open Folder" target={result.path} />
        <Action.CopyToClipboard
          title="Copy Path"
          content={result.path}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
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
    );
  }
  return (
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
  );
}

/** Debounce hook — prevents useExec from firing on every keystroke */
function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timerRef.current = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timerRef.current);
  }, [value, delayMs]);

  return debounced;
}

export default function SearchFiles() {
  const [query, setQuery] = useState("");
  const findrPath = getFindrPath();
  const maxResults = getMaxResults();
  const findrEnv = getFindrEnv();
  const binaryExists = useMemo(() => existsSync(findrPath), [findrPath]);

  // Debounce search input — prevents racing subprocesses on fast typing
  const debouncedQuery = useDebouncedValue(query, 300);
  const isSearchReady = debouncedQuery.trim().length >= 2;

  // Search: raw useEffect — re-executes reliably on query change
  const [searchData, setSearchData] = useState<SearchResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isSearchReady || !binaryExists) {
      setSearchData(null);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);
    let killed = false;
    const child = execFile(
      findrPath,
      ["search", debouncedQuery, "--json", "--limit", String(maxResults)],
      { env: { ...process.env, ...findrEnv } },
      (err, stdout) => {
        if (killed) return; // ignore callback from killed process
        if (err) {
          setSearchError(new Error(err.message));
          setSearchLoading(false);
          return;
        }
        try {
          setSearchData(JSON.parse(stdout) as SearchResponse);
          setSearchError(null);
        } catch {
          setSearchError(new Error("Failed to parse search output"));
        }
        setSearchLoading(false);
      },
    );

    return () => {
      killed = true;
      child.kill();
    };
  }, [debouncedQuery, isSearchReady, binaryExists]);

  // Recent files: raw useEffect — no caching layer to return stale data
  const [recentData, setRecentData] = useState<SearchResponse | null>(null);
  const [recentLoading, setRecentLoading] = useState(true);

  useEffect(() => {
    if (!binaryExists) {
      setRecentLoading(false);
      return;
    }
    execFile(
      findrPath,
      ["search", "", "--json", "--limit", "20"],
      { env: { ...process.env, ...findrEnv } },
      (err, stdout) => {
        if (!err && stdout) {
          try {
            setRecentData(JSON.parse(stdout));
          } catch {
            /* ignore parse errors */
          }
        }
        setRecentLoading(false);
      },
    );
  }, [findrPath, binaryExists]);

  const isTyping = query.length > 0;
  const showRecent = !isTyping && recentData?.mode === "recent";
  const recentResults = recentData?.results || [];

  const searchResults = searchData?.results || [];
  const elapsed = searchData?.elapsed_ms ?? 0;
  const isIndexing = searchData?.mode === "indexing";


  // Show loading only during active search, not during initial debounce
  const isLoading = isTyping
    ? searchLoading || (query !== debouncedQuery && isSearchReady)
    : recentLoading;

  const error = searchError;

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Search failed",
        message: error.message,
        primaryAction: {
          title: "Copy Error",
          shortcut: { modifiers: ["cmd"], key: "t" },
          onAction: async (toast) => {
            const { Clipboard } = await import("@raycast/api");
            await Clipboard.copy(error.message);
            toast.hide();
          },
        },
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

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={true}
      searchBarPlaceholder="Search files... (e.g. 'resume pdf', 'brainform folder')"
      onSearchTextChange={setQuery}
      throttle
    >
      {showRecent ? (
        <List.Section title="Recent Files">
          {recentResults.map((result, index) => (
            <ResultItem
              key={`recent-${result.path}-${index}`}
              result={result}
            />
          ))}
        </List.Section>
      ) : !isTyping ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Type to search"
          description="Searches filenames and file contents. Append a type to filter (e.g. 'invoice pdf')"
        />
      ) : query.trim().length < 2 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Type one more character"
          description="Search requires at least 2 characters"
        />
      ) : isIndexing ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="Building index..."
          description="First run: indexing your files (~25 seconds). Search again in a moment."
        />
      ) : searchResults.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="No results"
          description={`Nothing found for "${query}".`}
        />
      ) : (
        <List.Section
          title={`${searchResults.length} results`}
          subtitle={`${elapsed}ms`}
        >
          {searchResults.map((result, index) => (
            <ResultItem
              key={`search-${result.path}-${index}`}
              result={result}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function ResultItem({ result }: { result: SearchResult }) {
  return (
    <List.Item
      icon={getResultIcon(result)}
      title={result.filename}
      accessories={result.is_dir ? [{ tag: "Folder" }] : []}
      quickLook={
        result.is_dir ? undefined : { path: result.path, name: result.filename }
      }
      detail={<ResultDetail result={result} />}
      actions={<ResultActions result={result} />}
    />
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
          {result.is_dir ? (
            <List.Item.Detail.Metadata.Label title="Type" text="FOLDER" />
          ) : (
            result.file_type && (
              <List.Item.Detail.Metadata.Label
                title="Type"
                text={result.file_type.toUpperCase()}
              />
            )
          )}
          {result.size_bytes && !result.is_dir && (
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
