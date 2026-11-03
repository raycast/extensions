import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  open,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import fs from "fs";
import os from "os";
import path from "path";
import { useEffect, useState } from "react";
import { detectInstalledGames } from "./lib/game-detector";
import { gameIcon } from "./lib/game-icon";
import { launchGame } from "./lib/launcher";
import { loadManifest, refreshManifest } from "./lib/manifest";
import { matchGames } from "./lib/matcher";
import type { GameWithPaths, ResolvedPath, Store } from "./lib/types";

const STORE_LABEL: Record<Store, string> = {
  steam: "Steam",
  gog: "GOG",
  epic: "Epic Games",
  xbox: "Xbox",
};

const STORE_ORDER: Store[] = ["steam", "gog", "epic", "xbox"];

export default function Command() {
  const [games, setGames] = useState<GameWithPaths[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState("Starting...");

  async function loadGames(forceRefresh = false) {
    setIsLoading(true);
    try {
      const manifest = forceRefresh
        ? await refreshManifest(setStatusMsg)
        : await loadManifest(setStatusMsg);

      setStatusMsg("Detecting installed games...");
      const installed = await detectInstalledGames(forceRefresh);

      setStatusMsg("Matching against database...");
      const matched = matchGames(installed, manifest);

      setGames(matched);

      if (matched.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No games found",
          message: "Could not detect games with known save/config paths.",
        });
      }
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error loading games",
        message: String(err),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshInstalled() {
    setIsLoading(true);
    try {
      const manifest = await loadManifest(setStatusMsg);
      setStatusMsg("Re-detecting installed games...");
      const installed = await detectInstalledGames(true);
      setStatusMsg("Matching against database...");
      setGames(matchGames(installed, manifest));
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error refreshing installed games",
        message: String(err),
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      await loadGames();
    })();
  }, []);

  const byStore = STORE_ORDER.map((store) => ({
    store,
    games: games.filter((g) => g.store === store),
  })).filter((s) => s.games.length > 0);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search games...">
      {isLoading && games.length === 0 && <List.EmptyView title={statusMsg} />}
      {byStore.map(({ store, games: storeGames }) => (
        <List.Section key={store} title={STORE_LABEL[store]}>
          {storeGames.map((game) => (
            <GameListItem
              key={`${game.store}-${game.storeGameId ?? game.name}`}
              game={game}
              onRefresh={() => loadGames(true)}
              onRefreshInstalled={refreshInstalled}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function GameListItem({
  game,
  onRefresh,
  onRefreshInstalled,
}: {
  game: GameWithPaths;
  onRefresh: () => void;
  onRefreshInstalled: () => void;
}) {
  const saveCount = game.savePaths.length;
  const configCount = game.configPaths.length;
  const saveExists = game.savePaths.some((p) => p.exists);
  const configExists = game.configPaths.some((p) => p.exists);

  const accessories: List.Item.Accessory[] = [];
  if (saveCount > 0) {
    accessories.push({
      tag: {
        value: `${saveCount} save${saveCount > 1 ? "s" : ""}`,
        color: saveExists ? Color.Green : Color.SecondaryText,
      },
      tooltip: saveExists ? "Save folder found" : "Save folder not found yet",
    });
  }
  if (configCount > 0) {
    accessories.push({
      tag: {
        value: `${configCount} config${configCount > 1 ? "s" : ""}`,
        color: configExists ? Color.Blue : Color.SecondaryText,
      },
      tooltip: configExists
        ? "Config folder found"
        : "Config folder not found yet",
    });
  }

  return (
    <List.Item
      title={game.name}
      icon={gameIcon(game)}
      accessories={accessories}
      actions={
        <ActionPanel>
          {game.launchTarget && (
            <ActionPanel.Section>
              <Action
                title="Launch Game"
                icon={Icon.Play}
                onAction={() =>
                  launchGame(game.launchTarget!).catch((err) =>
                    showToast({
                      style: Toast.Style.Failure,
                      title: "Could not launch game",
                      message: String(err),
                    }),
                  )
                }
              />
            </ActionPanel.Section>
          )}
          <SaveActions paths={game.savePaths} />
          <ConfigActions paths={game.configPaths} />
          <ActionPanel.Section>
            <Action
              title="Refresh Installed Games"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onRefreshInstalled}
            />
            <Action
              title="Refresh Game Database"
              icon={Icon.Download}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={onRefresh}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function pathLabel(p: ResolvedPath): string | undefined {
  const parts: string[] = [];
  if (p.os) parts.push(p.os.charAt(0).toUpperCase() + p.os.slice(1));
  if (p.store) parts.push(p.store.charAt(0).toUpperCase() + p.store.slice(1));
  return parts.length > 0 ? parts.join(", ") : undefined;
}

function folderTitle(p: ResolvedPath, context: "save" | "config"): string {
  const hasBoth = p.tags.includes("save") && p.tags.includes("config");
  const base = hasBoth
    ? "Save & Config Folder"
    : context === "save"
      ? "Save Folder"
      : "Config Folder";
  const label = pathLabel(p);
  return label ? `Open ${base} (${label})` : `Open ${base}`;
}

function openFolder(p: ResolvedPath) {
  // If the path is a file (exists: check stat; otherwise: infer from extension), open its parent folder
  let target = p.path;
  if (p.exists) {
    if (fs.statSync(p.path).isFile()) target = path.dirname(p.path);
  } else if (path.extname(p.path)) {
    target = path.dirname(p.path);
  }
  while (!fs.existsSync(target) && path.dirname(target) !== target) {
    target = path.dirname(target);
  }
  return os.platform() === "darwin" ? showInFinder(target) : open(target);
}

function SaveActions({ paths }: { paths: ResolvedPath[] }) {
  if (paths.length === 0) return null;
  return (
    <ActionPanel.Section title="Save Files">
      {paths.map((p, i) => (
        <Action
          key={i}
          title={folderTitle(p, "save")}
          icon={p.exists ? Icon.Folder : Icon.QuestionMark}
          onAction={() => openFolder(p)}
        />
      ))}
    </ActionPanel.Section>
  );
}

function ConfigActions({ paths }: { paths: ResolvedPath[] }) {
  if (paths.length === 0) return null;
  return (
    <ActionPanel.Section title="Config Files">
      {paths.map((p, i) => (
        <Action
          key={i}
          title={folderTitle(p, "config")}
          icon={p.exists ? Icon.Gear : Icon.QuestionMark}
          onAction={() => openFolder(p)}
        />
      ))}
    </ActionPanel.Section>
  );
}
