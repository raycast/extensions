import {
  Action,
  ActionPanel,
  List,
  Icon,
  Keyboard,
  Clipboard,
  LocalStorage,
  showToast,
  Toast,
  open,
  showInFinder,
} from "@raycast/api";
import { useState, useMemo, useEffect } from "react";
import { existsSync } from "fs";
import { execFile } from "child_process";
import { SearchResponse, SearchResult } from "./types";
import {
  getFindrPath,
  ensureFindrBinaries,
  getMaxResults,
  getOpenRouterApiKey,
  getCustomPaths,
  getFileIcon,
  trackInteraction,
  parseSearchStdout,
  mergedFindrEnv,
  buildSearchArgs,
} from "./utils";
import { openBugReport } from "./bug-report";
import { useDebouncedValue, useFailureToast, useAnimatedToast } from "./hooks";
import { ResultDetail } from "./preview";

function getResultIcon(result: SearchResult): string {
  if (result.is_dir) return "📁";
  return getFileIcon(result.file_type);
}

function ResultActions({ result }: { result: SearchResult }) {
  if (result.is_dir) {
    return (
      <ActionPanel>
        <Action
          title="Open in Finder"
          onAction={() => {
            trackInteraction(result.path, "finder");
            showInFinder(result.path);
          }}
        />
        <Action
          title="Open Folder"
          onAction={() => {
            trackInteraction(result.path, "open");
            open(result.path);
          }}
        />
        <Action
          title="Copy Path"
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          onAction={() => {
            trackInteraction(result.path, "copy");
            Clipboard.copy(result.path);
          }}
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
      <Action
        title="Open File"
        onAction={() => {
          trackInteraction(result.path, "open");
          open(result.path);
        }}
      />
      <Action
        title="Show in Finder"
        shortcut={{ modifiers: ["cmd"], key: "return" }}
        onAction={() => {
          trackInteraction(result.path, "finder");
          showInFinder(result.path);
        }}
      />
      <Action.ToggleQuickLook
        shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
      />
      <Action
        title="Copy Path"
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        onAction={() => {
          trackInteraction(result.path, "copy");
          Clipboard.copy(result.path);
        }}
      />
      <Action
        title="Copy Filename"
        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
        onAction={() => {
          trackInteraction(result.path, "copy");
          Clipboard.copy(result.filename);
        }}
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

export default function SearchFiles() {
  const [query, setQuery] = useState("");
  const [findrPath, setFindrPath] = useState(() => getFindrPath());
  const maxResults = getMaxResults();
  const openRouterApiKey = getOpenRouterApiKey();
  const execEnv = useMemo(
    () =>
      mergedFindrEnv(
        openRouterApiKey ? { OPENROUTER_API_KEY: openRouterApiKey } : {},
      ),
    [openRouterApiKey],
  );
  const binaryExists = useMemo(() => existsSync(findrPath), [findrPath]);

  useEffect(() => {
    if (binaryExists) return;
    let cancelled = false;
    showToast({
      style: Toast.Style.Animated,
      title: "Downloading findr engine...",
    });
    ensureFindrBinaries()
      .then((path) => {
        if (cancelled) return;
        setFindrPath(path);
        showToast({ style: Toast.Style.Success, title: "findr ready" });
      })
      .catch((err) => {
        if (cancelled) return;
        showToast({
          style: Toast.Style.Failure,
          title: "Download failed",
          message: String(err),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [binaryExists]);

  const debouncedQuery = useDebouncedValue(query, 300);
  const isSearchReady = debouncedQuery.trim().length >= 2;

  const [searchData, setSearchData] = useState<SearchResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<Error | null>(null);

  useEffect(() => {
    setSearchError(null);
  }, [query]);

  useEffect(() => {
    if (!isSearchReady || !binaryExists) {
      setSearchData(null);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);
    let killed = false;
    const child = execFile(
      findrPath,
      buildSearchArgs(debouncedQuery, maxResults, { sync: false }),
      { env: execEnv },
      (err, stdout) => {
        if (killed) return;
        if (err) {
          setSearchError(new Error(err.message));
          setSearchLoading(false);
          return;
        }
        try {
          setSearchData(parseSearchStdout(stdout));
          setSearchError(null);
        } catch (e) {
          setSearchError(
            e instanceof Error ? e : new Error("Failed to parse search output"),
          );
        }
        setSearchLoading(false);
      },
    );

    return () => {
      killed = true;
      child.kill();
    };
  }, [
    debouncedQuery,
    isSearchReady,
    binaryExists,
    findrPath,
    maxResults,
    execEnv,
  ]);

  const debouncedSemantic = useDebouncedValue(query, 1300);
  const isSemanticReady = debouncedSemantic.trim().length >= 2;

  useEffect(() => {
    if (!isSemanticReady || !binaryExists || !searchData) return;

    let killed = false;
    const child = execFile(
      findrPath,
      buildSearchArgs(debouncedSemantic, maxResults, {
        semantic: true,
        sync: false,
      }),
      { env: execEnv, timeout: 4000 },
      (err, stdout) => {
        if (killed || err) return;
        try {
          const semanticData = parseSearchStdout(stdout);
          if (semanticData.total_results > 0) {
            setSearchData(semanticData);
          }
        } catch {
          /* fast results stay */
        }
      },
    );

    return () => {
      killed = true;
      child.kill();
    };
  }, [
    debouncedSemantic,
    isSemanticReady,
    binaryExists,
    searchData !== null,
    findrPath,
    maxResults,
    execEnv,
  ]);

  const [recentData, setRecentData] = useState<SearchResponse | null>(null);
  const [recentLoading, setRecentLoading] = useState(true);

  useEffect(() => {
    if (!binaryExists) {
      setRecentLoading(false);
      return;
    }
    let cancelled = false;

    const onRecentResults =
      (clearLoading: boolean) => (err: Error | null, stdout: string) => {
        if (cancelled) return;
        if (!err && stdout) {
          try {
            setRecentData(parseSearchStdout(stdout));
          } catch {
            /* ignore */
          }
        }
        if (clearLoading) setRecentLoading(false);
      };

    const staleChild = execFile(
      findrPath,
      buildSearchArgs("", maxResults, { sync: false }),
      { env: execEnv },
      onRecentResults(true),
    );
    const freshChild = execFile(
      findrPath,
      buildSearchArgs("", maxResults),
      { env: execEnv },
      onRecentResults(false),
    );

    return () => {
      cancelled = true;
      staleChild.kill();
      freshChild.kill();
    };
  }, [findrPath, binaryExists, maxResults, execEnv]);

  const customPaths = getCustomPaths();
  useEffect(() => {
    if (!binaryExists || !customPaths) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    LocalStorage.getItem<string>("findr_custom_paths").then((stored) => {
      if (cancelled) return;
      const storedSet = new Set(
        (stored || "")
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean),
      );
      const currentList = customPaths
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      const newPaths = currentList.filter((p) => !storedSet.has(p));

      if (newPaths.length > 0) {
        timer = setTimeout(() => {
          if (cancelled) return;
          let completed = 0;
          for (const p of newPaths) {
            execFile(findrPath, ["index", "add-path", p], (err) => {
              if (cancelled) return;
              if (!err) completed++;
              if (completed === newPaths.length) {
                LocalStorage.setItem(
                  "findr_custom_paths",
                  currentList.join(","),
                );
              }
            });
          }
        }, 10000);
      } else if (currentList.length > 0 && !stored) {
        LocalStorage.setItem("findr_custom_paths", currentList.join(","));
      }
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [customPaths, binaryExists, findrPath]);

  const isTyping = query.length > 0;
  const showRecent = !isTyping && recentData?.mode === "recent";
  const recentResults = recentData?.results || [];
  const searchResults = searchData?.results || [];
  const elapsed = searchData?.elapsed_ms ?? 0;
  const isIndexing = searchData?.mode === "indexing";
  const isLoading = isTyping
    ? searchLoading || (query !== debouncedQuery && isSearchReady)
    : recentLoading;

  useFailureToast(searchError);
  useAnimatedToast(
    isIndexing,
    "Building index for the first time...",
    "This takes ~25 seconds. Search again shortly.",
  );

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

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={true}
      searchBarPlaceholder="Search files... (e.g. 'cv pdf', 'project folder', 'png in:downloads')"
      onSearchTextChange={setQuery}
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
      ) : searchError ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Search failed"
          description={searchError.message}
          actions={
            <ActionPanel>
              <Action
                title="Report Bug with Diagnostics"
                onAction={() => openBugReport(searchError.message)}
              />
            </ActionPanel>
          }
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
