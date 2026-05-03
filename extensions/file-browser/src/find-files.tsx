import { Action, ActionPanel, Icon, List, getPreferenceValues, useNavigation } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { FindFilesBrowser } from "$lib/pages/find-files-browser";
import { EditSearchForm } from "$lib/pages/find-files-browser/edit-search-form";
import {
  QUERY_HISTORY_KEY,
  clearHistory,
  deleteArtifactHistoryEntry,
  mergeArtifactHistoryEntry,
  normalizeArtifactHistoryEntries,
} from "$lib/pages/find-files-browser/logic/history";
import { getDirectoryBrowserDefaults } from "$lib/preferences";
import type { ArtifactHistoryEntry, FindFilesSearchArtifact } from "$lib/pages/find-files-browser/logic/types";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const directoryBrowserDefaults = getDirectoryBrowserDefaults(preferences);
  const enterAction = preferences.enterAction ?? "detail";
  const { push } = useNavigation();

  const [rawHistory, setRawHistory] = useCachedState<ArtifactHistoryEntry[]>(QUERY_HISTORY_KEY, []);
  const [query, setQuery] = useState("");

  const artifactHistory = useMemo(() => normalizeArtifactHistoryEntries(rawHistory), [rawHistory]);

  useEffect(() => {
    if (rawHistory.length !== artifactHistory.length) {
      setRawHistory(artifactHistory);
    }
  }, [rawHistory.length, artifactHistory.length, artifactHistory, setRawHistory]);

  const trimmedQuery = query.trim();
  const filteredHistory = useMemo(() => {
    if (!trimmedQuery) return artifactHistory;
    const needle = trimmedQuery.toLowerCase();
    return artifactHistory.filter((entry) => entry.artifact.naturalQuery.toLowerCase().includes(needle));
  }, [artifactHistory, trimmedQuery]);

  const sections: { title: string; items: ArtifactHistoryEntry[]; isNew?: boolean }[] = [];
  if (trimmedQuery) {
    const now = Date.now();
    const placeholderArtifact: FindFilesSearchArtifact = {
      naturalQuery: trimmedQuery,
      predicate: "",
      scopePath: "",
      scopeMode: "recursive",
      interpretation: "",
      createdAt: now,
      updatedAt: now,
    };
    sections.push({
      title: "New Query",
      items: [{ timestamp: now, artifact: placeholderArtifact }],
      isNew: true,
    });
  }
  if (filteredHistory.length > 0) {
    sections.push({ title: "Recent Queries", items: filteredHistory });
  }

  const recordArtifact = (artifact: FindFilesSearchArtifact) => {
    if (!artifact.naturalQuery.trim()) return;
    setRawHistory((prev) => {
      const normalized = normalizeArtifactHistoryEntries(prev);
      const merged = mergeArtifactHistoryEntry(normalized, artifact);
      return merged;
    });
  };

  const removeFromHistory = (entry: ArtifactHistoryEntry) => {
    const naturalQuery = entry.artifact.naturalQuery.trim();
    if (!naturalQuery) return;
    setRawHistory((prev) => {
      const normalized = normalizeArtifactHistoryEntries(prev);
      const filtered = deleteArtifactHistoryEntry(normalized, naturalQuery);
      return filtered;
    });
  };

  const handleClearAll = () => {
    setRawHistory(clearHistory(artifactHistory));
  };

  return (
    <List
      navigationTitle="Find Files"
      searchBarPlaceholder="Describe a file to find…"
      enableFiltering={false}
      onSearchTextChange={setQuery}
    >
      {sections.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={artifactHistory.length > 0 ? "Type to search" : "No recent queries"}
          description={
            artifactHistory.length > 0
              ? "Type a new request or pick a recent one."
              : "Type a request to search. Your recent queries will show up here."
          }
        />
      ) : null}

      {sections.map((section) => (
        <List.Section title={section.title} key={section.title}>
          {section.items.map((entry) => {
            const { artifact } = entry;
            const cachedArtifact = section.isNew
              ? artifactHistory.find((h) => h.artifact.naturalQuery === artifact.naturalQuery)?.artifact
              : null;
            const resolvedScope = cachedArtifact?.scopePath || artifact.scopePath || preferences.startDirectory;
            const searchScope = section.isNew ? preferences.startDirectory : resolvedScope;
            const scopeLabel = resolvedScope ? (resolvedScope.split("/").pop() ?? resolvedScope) : undefined;

            return (
              <List.Item
                key={
                  section.isNew ? `new-${artifact.naturalQuery}` : `hist-${artifact.naturalQuery}-${entry.timestamp}`
                }
                icon={section.isNew ? Icon.MagnifyingGlass : Icon.Clock}
                title={artifact.naturalQuery}
                accessories={
                  section.isNew
                    ? []
                    : [
                        {
                          text: artifact.interpretation || scopeLabel,
                          icon: resolvedScope ? Icon.Folder : undefined,
                        },
                      ]
                }
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Search"
                      icon={Icon.MagnifyingGlass}
                      target={
                        <FindFilesBrowser
                          query={artifact.naturalQuery}
                          scopePath={searchScope}
                          onArtifactGenerated={recordArtifact}
                          {...directoryBrowserDefaults}
                          enterAction={enterAction}
                        />
                      }
                    />
                    {!section.isNew ? (
                      <Action.Push
                        title="Edit Search"
                        icon={Icon.Pencil}
                        shortcut={{ modifiers: ["cmd"], key: "e" }}
                        target={
                          <EditSearchForm
                            initialArtifact={artifact}
                            onSubmit={(editedArtifact) => {
                              recordArtifact(editedArtifact);
                              push(
                                <FindFilesBrowser
                                  query={editedArtifact.naturalQuery}
                                  scopePath={editedArtifact.scopePath || resolvedScope}
                                  initialArtifact={editedArtifact}
                                  {...directoryBrowserDefaults}
                                  enterAction={enterAction}
                                />,
                              );
                            }}
                          />
                        }
                      />
                    ) : null}
                    <Action.CopyToClipboard title="Copy Query" content={artifact.naturalQuery} />
                    {!section.isNew ? (
                      <Action title="Remove from History" icon={Icon.Trash} onAction={() => removeFromHistory(entry)} />
                    ) : null}
                    {artifactHistory.length > 0 ? (
                      <Action title="Clear All History" icon={Icon.Trash} onAction={handleClearAll} />
                    ) : null}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
