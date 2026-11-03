import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { loadManifest, refreshManifest } from "./lib/manifest";
import type { IndexedGame, ManifestIndex } from "./lib/types";

const MAX_RESULTS = 50;

export default function Command() {
  const [manifest, setManifest] = useState<ManifestIndex | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState("Loading game database...");
  const [query, setQuery] = useState("");

  async function load(forceRefresh = false) {
    setIsLoading(true);
    try {
      const index = forceRefresh
        ? await refreshManifest(setStatusMsg)
        : await loadManifest(setStatusMsg);
      setManifest(index);
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load manifest",
        message: String(err),
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

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
      {isLoading ? (
        <List.EmptyView title={statusMsg} />
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
            onRefresh={() => load(true)}
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
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onRefresh}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
