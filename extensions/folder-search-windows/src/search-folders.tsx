import { Action, ActionPanel, Icon, Keyboard, List, openExtensionPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useRef, useState } from "react";
import { FolderItem } from "./components/folders";
import { searchIndex } from "./lib/folder-index";
import { getPrefs } from "./lib/prefs";
import { searchFolders } from "./lib/search";
import { useFolderList } from "./lib/storage";
import { useFolderIndex } from "./lib/use-folder-index";

const REBUILD_SHORTCUT: Keyboard.Shortcut = {
  Windows: { modifiers: ["ctrl", "shift"], key: "i" },
  macOS: { modifiers: ["cmd", "shift"], key: "i" },
};

export default function Command() {
  const prefs = useMemo(getPrefs, []);
  const [query, setQuery] = useState("");
  const pinned = useFolderList("pinned");
  const recent = useFolderList("recent", 20);
  const index = useFolderIndex(prefs);
  const abortable = useRef<AbortController | null>(null);

  const hasQuery = query.trim().length > 0;

  // Everything (if installed): instant results for NTFS disks, always up to date.
  const everything = usePromise((q: string) => searchFolders(q, prefs, abortable.current?.signal), [query], {
    execute: hasQuery,
    abortable,
    onError: () => undefined,
  });

  // Built-in index: Google Drive, external disks, anything Everything doesn't see.
  const indexResults = useMemo(
    () => (hasQuery ? searchIndex(index.items, query, prefs.maxResults) : []),
    [hasQuery, index.items, query, prefs.maxResults],
  );

  const results = useMemo(() => {
    if (!hasQuery) return [];
    const seen = new Set<string>();
    const merged: string[] = [];
    for (const p of [...indexResults, ...(everything.data?.paths ?? [])]) {
      const k = p.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      merged.push(p);
    }
    return merged.slice(0, prefs.maxResults);
  }, [hasQuery, indexResults, everything.data, prefs.maxResults]);

  const recentOnly = recent.items.filter((p) => !pinned.has(p));
  const status = everything.data?.status;

  const progress = index.progress;
  const indexInfo = progress
    ? `Indexing… ${progress.total.toLocaleString()} folders`
    : `${index.items.length.toLocaleString()} folders indexed`;
  const subtitle = [
    `${results.length}`,
    indexInfo,
    status === "ok" ? "+ Everything" : status === "not-running" ? "Everything not running" : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  const rebuildAction = (
    <Action
      title="Rebuild Folder Index"
      icon={Icon.ArrowClockwise}
      shortcut={REBUILD_SHORTCUT}
      onAction={() => void index.rebuildAll()}
    />
  );

  return (
    <List
      isLoading={!index.isLoaded || everything.isLoading || pinned.isLoading || recent.isLoading || !!progress}
      filtering={false}
      throttle
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search folders…"
    >
      {index.isLoaded && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={hasQuery ? "No folders found" : "Type to search folders"}
          description={
            progress
              ? "Still indexing: folders appear here as they are found."
              : hasQuery
                ? `Nothing matches “${query.trim()}”. ${indexInfo}. Press Ctrl+Shift+I to rebuild the index.`
                : "Pinned and recently opened folders will appear here."
          }
          actions={
            <ActionPanel>
              {rebuildAction}
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      )}

      {progress && (
        <List.Section title="Index">
          <List.Item
            title={`Indexing folders… ${progress.total.toLocaleString()} found`}
            subtitle={progress.scanning.length ? `Scanning ${progress.scanning.join(", ")}` : undefined}
            icon={Icon.CircleProgress}
            accessories={[{ text: "keep this window open" }]}
            actions={<ActionPanel>{rebuildAction}</ActionPanel>}
          />
        </List.Section>
      )}

      {!hasQuery && (
        <>
          <List.Section title="Pinned">
            {pinned.items.map((p) => (
              <FolderItem
                key={`pin-${p}`}
                folder={p}
                prefs={prefs}
                pinned={pinned}
                recent={recent}
                section="pinned"
                extraActions={rebuildAction}
              />
            ))}
          </List.Section>
          <List.Section title="Recent">
            {recentOnly.map((p) => (
              <FolderItem
                key={`rec-${p}`}
                folder={p}
                prefs={prefs}
                pinned={pinned}
                recent={recent}
                section="recent"
                extraActions={rebuildAction}
              />
            ))}
          </List.Section>
        </>
      )}

      {hasQuery && (
        <List.Section title="Folders" subtitle={subtitle}>
          {results.map((p) => (
            <FolderItem key={p} folder={p} prefs={prefs} pinned={pinned} recent={recent} extraActions={rebuildAction} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
