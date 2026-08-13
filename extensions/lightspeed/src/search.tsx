import {
  Action,
  ActionPanel,
  Clipboard,
  Keyboard,
  List,
  Toast,
  environment,
  getPreferenceValues,
  open,
  openExtensionPreferences,
  showInFinder,
  showToast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { getFileIndex } from "./file-index";
import type { SearchResult, SearchScope } from "./types";

const SEARCH_DELAY_MS = 35;

function IndexActions({ rebuild }: { rebuild: () => void }) {
  return (
    <ActionPanel.Section title="Lightspeed Index">
      <Action title="Rebuild Index" onAction={rebuild} />
      <Action title="Index Preferences" onAction={openExtensionPreferences} />
    </ActionPanel.Section>
  );
}

function ResultActions({ result, rebuild }: { result: SearchResult; rebuild: () => void }) {
  return (
    <ActionPanel>
      <Action title={result.isDirectory ? "Open Folder" : "Open File"} onAction={() => open(result.fullPath)} />
      <Action
        title="Show in File Explorer"
        shortcut={{ modifiers: ["ctrl", "shift"], key: "enter" }}
        onAction={() => showInFinder(result.fullPath)}
      />
      <ActionPanel.Section>
        <Action
          title="Copy Path"
          shortcut={Keyboard.Shortcut.Common.Copy}
          onAction={() => Clipboard.copy(result.fullPath)}
        />
        <Action
          title="Copy Name"
          shortcut={Keyboard.Shortcut.Common.CopyName}
          onAction={() => Clipboard.copy(result.name)}
        />
      </ActionPanel.Section>
      <IndexActions rebuild={rebuild} />
    </ActionPanel>
  );
}

export default function SearchCommand() {
  const preferences = getPreferenceValues<Preferences.Search>();
  const index = useMemo(
    () => getFileIndex(preferences.indexRoots, preferences.excludedPaths, environment.supportPath),
    [preferences.excludedPaths, preferences.indexRoots],
  );
  const maxResults = Number(preferences.maxResults) || 100;
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScope>("all");
  const [revision, setRevision] = useState(0);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [elapsedMs, setElapsedMs] = useState<number>();
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const unsubscribe = index.subscribe(() => setRevision((value) => value + 1));
    void index.start();
    return unsubscribe;
  }, [index]);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setResults([]);
      setElapsedMs(undefined);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      const startedAt = performance.now();
      setResults(index.search(trimmedQuery, scope, maxResults));
      setElapsedMs(Math.max(1, Math.round(performance.now() - startedAt)));
      setIsSearching(false);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [index, maxResults, query, revision, scope]);

  const rebuild = () => {
    void showToast({ style: Toast.Style.Animated, title: "Rebuilding Lightspeed index" });
    void index.rebuild();
  };

  const status = index.status;
  const indexing = status.phase === "loading" || status.phase === "indexing";
  const emptyView = (() => {
    if (status.phase === "error") {
      return (
        <List.EmptyView
          title="Index Unavailable"
          description={status.message}
          actions={
            <ActionPanel>
              <IndexActions rebuild={rebuild} />
            </ActionPanel>
          }
        />
      );
    }
    if (!query.trim()) {
      return (
        <List.EmptyView
          title={indexing ? "Building Your File Index" : "Search at Lightspeed"}
          description={
            indexing
              ? `${status.scannedCount.toLocaleString()} files and folders discovered. You can search while indexing continues.`
              : `${status.indexedCount.toLocaleString()} files and folders ready. Try a name, path, wildcard, or ext: filter.`
          }
          actions={
            <ActionPanel>
              <IndexActions rebuild={rebuild} />
            </ActionPanel>
          }
        />
      );
    }
    return (
      <List.EmptyView
        title={isSearching ? "Searching…" : indexing ? "Still Indexing" : "No Results"}
        description={
          isSearching
            ? "Searching the local Lightspeed index"
            : indexing
              ? "This location may not have been indexed yet. Results update as files are discovered."
              : `Nothing matched “${query.trim()}”.`
        }
        actions={
          <ActionPanel>
            <IndexActions rebuild={rebuild} />
          </ActionPanel>
        }
      />
    );
  })();

  const navigationTitle = `Lightspeed · ${status.indexedCount.toLocaleString()} indexed${
    indexing ? " · Indexing" : elapsedMs ? ` · ${elapsedMs} ms` : ""
  }`;

  return (
    <List
      navigationTitle={navigationTitle}
      filtering={false}
      isLoading={indexing || isSearching}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search every indexed file and folder…"
      throttle={false}
      searchBarAccessory={
        <List.Dropdown tooltip="Result Type" value={scope} onChange={(value) => setScope(value as SearchScope)}>
          <List.Dropdown.Item title="Everything" value="all" />
          <List.Dropdown.Item title="Files" value="files" />
          <List.Dropdown.Item title="Folders" value="folders" />
          <List.Dropdown.Section title="Media">
            <List.Dropdown.Item title="Documents" value="documents" />
            <List.Dropdown.Item title="Images" value="images" />
            <List.Dropdown.Item title="Audio" value="audio" />
            <List.Dropdown.Item title="Video" value="video" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {results.length === 0
        ? emptyView
        : results.map((result) => (
            <List.Item
              key={result.fullPath}
              title={result.name}
              subtitle={result.parentPath}
              actions={<ResultActions result={result} rebuild={rebuild} />}
            />
          ))}
    </List>
  );
}
