import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useRef, useState } from "react";
import { loadManifestResult } from "./lib/manifest";
import { withProgressToast } from "./lib/progress-toast";
import type { IndexedGame } from "./lib/types";

const MAX_RESULTS = 50;

export default function Command() {
  const [statusMsg, setStatusMsg] = useState("Loading game database...");
  const [query, setQuery] = useState("");
  const forceNext = useRef(false);

  const {
    data: manifest,
    isLoading,
    error,
    revalidate,
  } = usePromise(
    async () => {
      const force = forceNext.current;
      forceNext.current = false;
      if (!force) return (await loadManifestResult(setStatusMsg)).manifest;
      const result = await withProgressToast(
        "Refreshing game database...",
        "Game database refreshed",
        (progress) => loadManifestResult(progress, true),
        (r) => !r.outdated,
      );
      return result.manifest;
    },
    [],
    { failureToastOptions: { title: "Failed to load the game database" } },
  );

  function refresh() {
    forceNext.current = true;
    revalidate();
  }

  const names = useMemo(
    () => (manifest ? Object.keys(manifest) : []),
    [manifest],
  );

  // Rendering the whole database (~14k rows) exhausts the extension's memory, so only matches are mounted.
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!manifest || !needle) return [];
    const starts: string[] = [];
    const contains: string[] = [];
    for (const name of names) {
      const lower = name.toLowerCase();
      if (lower.startsWith(needle)) starts.push(name);
      else if (lower.includes(needle)) contains.push(name);
      if (starts.length >= MAX_RESULTS) break;
    }
    return [...starts, ...contains].slice(0, MAX_RESULTS);
  }, [manifest, names, query]);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search all games..."
    >
      {isLoading && !manifest ? (
        <List.EmptyView title={statusMsg} />
      ) : error && !manifest ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not load the game database"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Try Again"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ) : (
        visible.length === 0 && (
          <List.EmptyView
            title={
              query.trim()
                ? "No games found"
                : "Type to search the game database"
            }
            description={
              query.trim()
                ? undefined
                : `${names.length.toLocaleString()} games indexed`
            }
          />
        )
      )}
      {manifest &&
        visible.map((name) => (
          <GameEntry
            key={name}
            name={name}
            game={manifest[name]}
            onRefresh={refresh}
          />
        ))}
    </List>
  );
}

function GameEntry({
  name,
  game,
  onRefresh,
}: {
  name: string;
  game: IndexedGame;
  onRefresh: () => void;
}) {
  const accessories: List.Item.Accessory[] = [];

  if (game.steamId)
    accessories.push({ text: `Steam: ${game.steamId}`, icon: Icon.Store });
  if (game.gogId)
    accessories.push({ text: `GOG: ${game.gogId}`, icon: Icon.Store });

  const pathCount = game.files.length;
  accessories.push({
    text: `${pathCount} path${pathCount !== 1 ? "s" : ""}`,
    icon: Icon.Folder,
  });

  return (
    <List.Item
      title={name}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Refresh Game Database"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onRefresh}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
