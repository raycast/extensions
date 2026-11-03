import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  open,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import fs from "fs";
import path from "path";
import { type ReactNode, useRef, useState } from "react";
import { detectInstalledGames } from "./lib/game-detector";
import { gameIcon } from "./lib/game-icon";
import { launchGame } from "./lib/launcher";
import { loadManifest } from "./lib/manifest";
import { matchGames } from "./lib/matcher";
import { withProgressToast } from "./lib/progress-toast";
import type { GameWithPaths, ResolvedPath, Store } from "./lib/types";

const STORE_LABEL: Record<Store, string> = {
  steam: "Steam",
  gog: "GOG",
  epic: "Epic Games",
  xbox: "Xbox",
};

const STORE_ORDER: Store[] = ["steam", "gog", "epic", "xbox"];

const REFRESH_DATABASE_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "r" },
  Windows: { modifiers: ["ctrl", "shift"], key: "r" },
};

type LoadMode = "cached" | "installed" | "database";

async function loadGames(
  progress: (msg: string) => void,
  forceDatabase: boolean,
  forceInstalled: boolean,
): Promise<GameWithPaths[]> {
  const manifest = await loadManifest(progress, forceDatabase);
  progress("Detecting installed games...");
  const installed = await detectInstalledGames(forceInstalled);
  progress("Matching against database...");
  return matchGames(installed, manifest);
}

export default function Command() {
  const [statusMsg, setStatusMsg] = useState("Starting...");
  const nextMode = useRef<LoadMode>("cached");

  const {
    data: games,
    isLoading,
    error,
    revalidate,
  } = usePromise(
    async () => {
      const mode = nextMode.current;
      nextMode.current = "cached";
      if (mode === "cached") return loadGames(setStatusMsg, false, false);
      return withProgressToast(
        mode === "database"
          ? "Refreshing game database..."
          : "Refreshing installed games...",
        "Games refreshed",
        (progress) => loadGames(progress, mode === "database", true),
      );
    },
    [],
    { failureToastOptions: { title: "Error loading games" } },
  );

  function reload(mode: LoadMode) {
    nextMode.current = mode;
    revalidate();
  }

  const refreshActions = (
    <ActionPanel.Section>
      <Action
        title="Refresh Installed Games"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={() => reload("installed")}
      />
      <Action
        title="Refresh Game Database"
        icon={Icon.Download}
        shortcut={REFRESH_DATABASE_SHORTCUT}
        onAction={() => reload("database")}
      />
    </ActionPanel.Section>
  );

  const byStore = STORE_ORDER.map((store) => ({
    store,
    games: (games ?? []).filter((g) => g.store === store),
  })).filter((s) => s.games.length > 0);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search games...">
      {isLoading && !games ? (
        <List.EmptyView title={statusMsg} />
      ) : error && !games ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not load your games"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Try Again"
                icon={Icon.ArrowClockwise}
                onAction={() => reload("cached")}
              />
              {refreshActions}
            </ActionPanel>
          }
        />
      ) : games?.length === 0 ? (
        <List.EmptyView
          icon={Icon.GameController}
          title="No games found"
          description="No installed game has known save or config paths."
          actions={<ActionPanel>{refreshActions}</ActionPanel>}
        />
      ) : null}
      {byStore.map(({ store, games: storeGames }) => (
        <List.Section key={store} title={STORE_LABEL[store]}>
          {storeGames.map((game) => (
            <GameListItem
              key={`${game.store}-${game.storeGameId ?? game.name}`}
              game={game}
              refreshActions={refreshActions}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function GameListItem({
  game,
  refreshActions,
}: {
  game: GameWithPaths;
  refreshActions: ReactNode;
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
                    showFailureToast(err, { title: "Could not launch game" }),
                  )
                }
              />
            </ActionPanel.Section>
          )}
          <SaveActions paths={game.savePaths} />
          <ConfigActions paths={game.configPaths} />
          {game.installPath && (
            <ActionPanel.Section title="Install Folder">
              <Action
                title="Open Install Folder"
                icon={Icon.HardDrive}
                onAction={() => openFolder(game.installPath!)}
              />
            </ActionPanel.Section>
          )}
          {refreshActions}
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

// A path that names a file opens its folder; a folder that does not exist yet opens its nearest existing parent.
function openFolder(target: string) {
  let folder = target;
  if (fs.existsSync(folder)) {
    if (fs.statSync(folder).isFile()) folder = path.dirname(folder);
  } else if (path.extname(folder)) {
    folder = path.dirname(folder);
  }
  while (!fs.existsSync(folder) && path.dirname(folder) !== folder) {
    folder = path.dirname(folder);
  }
  return open(folder).catch((err) =>
    showFailureToast(err, { title: "Could not open folder" }),
  );
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
          onAction={() => openFolder(p.path)}
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
          onAction={() => openFolder(p.path)}
        />
      ))}
    </ActionPanel.Section>
  );
}
