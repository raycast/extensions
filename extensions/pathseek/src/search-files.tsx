import {
  Action,
  ActionPanel,
  Icon,
  LaunchType,
  List,
  launchCommand,
} from "@raycast/api";
import { useEffect, useState } from "react";
import os from "node:os";
import path from "node:path";
import { fuzzySearch } from "./lib/fuzzy-search";
import { readIndex, type IndexMetadata } from "./lib/index-store";
import { getDialogNavigationPaths } from "./lib/dialog-navigation";
import {
  getMissingBinary,
  missingBinaryMessage,
  HOMEBREW_INSTALL_COMMAND,
  HOMEBREW_URL,
} from "./lib/dependency-guide";

export function SearchFilesView({
  dialogMode = false,
}: {
  dialogMode?: boolean;
}) {
  const [index, setIndex] = useState<IndexMetadata | null>();
  const [loadError, setLoadError] = useState<string>();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    let active = true;
    readIndex()
      .then((data) => {
        if (active) setIndex(data);
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(String(error));
          setIndex(null);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    if (!index || !query.trim()) {
      setResults([]);
      setIsSearching(false);
      return () => controller.abort();
    }

    setResults([]);
    setLoadError(undefined);
    setIsSearching(true);

    const timer = setTimeout(() => {
      fuzzySearch(index, query, controller.signal)
        .then((paths) => {
          if (!controller.signal.aborted) setResults(paths);
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) setLoadError(String(error));
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsSearching(false);
        });
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [index, query]);

  const missingBinary = getMissingBinary(loadError);

  const emptyTitle = missingBinary
    ? "Missing Required Tool"
    : loadError
      ? "Search Error"
      : index === undefined
        ? "Loading Index"
        : !index
          ? "No Index Yet"
          : !query.trim()
            ? "Type to Search"
            : "No Matching Files";

  const emptyDescription = missingBinary
    ? missingBinaryMessage(missingBinary)
    : loadError
      ? loadError
      : !index
        ? "No index yet. First install fd and fzf (brew install fd fzf), then choose folders in Build Index. Nothing is indexed automatically."
        : !query.trim()
          ? "Indexed " +
            index.count.toLocaleString() +
            " paths on " +
            new Date(index.createdAt).toLocaleString() +
            "."
          : "Try a different pattern or rebuild the index to include new files.";

  return (
    <List
      isLoading={index === undefined || isSearching}
      filtering={false}
      searchBarPlaceholder={
        dialogMode
          ? "Search files or folders to locate in the Open/Save dialog"
          : "Search with fzf: filename, path, .pdf$, !node_modules…"
      }
      onSearchTextChange={setQuery}
    >
      <List.EmptyView
        title={emptyTitle}
        description={emptyDescription}
        icon={Icon.MagnifyingGlass}
        actions={
          index !== undefined && (!index || missingBinary) ? (
            <ActionPanel>
              {!index && (
                <Action
                  title="Choose Folders and Build Index"
                  icon={Icon.Folder}
                  onAction={() =>
                    launchCommand({
                      name: "rebuild-index",
                      type: LaunchType.UserInitiated,
                    })
                  }
                />
              )}
              <Action.CopyToClipboard
                title="Copy fd/fzf Install Command"
                icon={Icon.CopyClipboard}
                content={HOMEBREW_INSTALL_COMMAND}
              />
              <Action.OpenInBrowser
                title="How to Install Homebrew"
                url={HOMEBREW_URL}
              />
              {!index && (
                <Action
                  title="View Index Status"
                  icon={Icon.Info}
                  onAction={() =>
                    launchCommand({
                      name: "index-status",
                      type: LaunchType.UserInitiated,
                    })
                  }
                />
              )}
            </ActionPanel>
          ) : undefined
        }
      />
      {results.map((filepath) => {
        const display = filepath.startsWith(os.homedir() + path.sep)
          ? "~" + filepath.slice(os.homedir().length)
          : filepath;
        return (
          <List.Item
            key={filepath}
            title={path.basename(filepath)}
            subtitle={path.dirname(display)}
            icon={{ fileIcon: filepath }}
            quickLook={{ path: filepath, name: path.basename(filepath) }}
            actions={
              <ActionPanel>
                {dialogMode && (
                  <ActionPanel.Section title="Assisted Open/Save Navigation">
                    <Action.Paste
                      title="Select File or Go to Folder (Paste Full Path)"
                      icon={Icon.ArrowRight}
                      content={getDialogNavigationPaths(filepath).selectedPath}
                    />
                    <Action.Paste
                      title="Go to Containing Folder (Fallback)"
                      icon={Icon.Folder}
                      content={
                        getDialogNavigationPaths(filepath).containingFolder
                      }
                    />
                  </ActionPanel.Section>
                )}
                <ActionPanel.Section title="Other File Actions">
                  <Action.Open title="Open" target={filepath} />
                  <Action.ShowInFinder title="Show in Finder" path={filepath} />
                  <Action.Open
                    title="Open Containing Folder"
                    target={path.dirname(filepath)}
                  />
                  <Action.OpenWith
                    path={filepath}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Absolute Path"
                    content={filepath}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.ToggleQuickLook
                    shortcut={{ modifiers: ["cmd"], key: "y" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

/** Default Search Files keeps its existing file-open behavior. */
export default function SearchFiles() {
  return <SearchFilesView />;
}
