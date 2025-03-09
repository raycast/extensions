import * as os from "os";
import * as path from "path";
import { useEffect, useState } from "react";

import { Action, ActionPanel, Icon, List, LocalStorage, open } from "@raycast/api";

import { findWorkspaceFiles, getFavorites, getWorkspaceName } from "./utils/utils";

import type { Favorite } from "./utils/types";

export default function Command() {
  const [workspaceFavorites, setWorkspaceFavorites] = useState<Favorite[]>([]);
  const [workspaceFiles, setWorkspaceFiles] = useState<string[] | undefined>(undefined);

  useEffect(() => {
    async function loadFavorites() {
      const favorites = await getFavorites();
      setWorkspaceFavorites(favorites);
    }

    loadFavorites();
  }, []);

  useEffect(() => {
    async function loadWorkspaces() {
      const homeDir = os.homedir();
      const files = await findWorkspaceFiles(homeDir);
      setWorkspaceFiles(files);
    }

    loadWorkspaces();
  }, []);

  const ActionItems = ({ filePath }: { filePath: string }) => (
    <ActionPanel>
      <Action
        title="Open"
        icon={Icon.AppWindow}
        onAction={() => {
          open(filePath);
        }}
      />
      <Action
        title="Open in Current VS Code Instance"
        icon={Icon.AppWindowList}
        shortcut={{ modifiers: ["shift"], key: "enter" }}
        onAction={() => {
          open(`vscode://file/${filePath}`);
        }}
      />
      {workspaceFavorites.some((favorite) => favorite.path === filePath) ? (
        <Action
          title="Remove from Favorites"
          icon={Icon.StarDisabled}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          onAction={() => {
            LocalStorage.removeItem(getWorkspaceName(filePath));
            setWorkspaceFavorites((favorites) => favorites.filter((favorite) => favorite.path !== filePath));
          }}
        />
      ) : (
        <Action
          title="Set as Favorite"
          icon={Icon.Star}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          onAction={() => {
            LocalStorage.setItem(getWorkspaceName(filePath), filePath);
            setWorkspaceFavorites((favorites) => [...favorites, { title: getWorkspaceName(filePath), path: filePath }]);
          }}
        />
      )}
      <Action.CopyToClipboard content={filePath} shortcut={{ modifiers: ["cmd"], key: "c" }} />
    </ActionPanel>
  );

  return (
    <List isLoading={!workspaceFiles} searchBarPlaceholder="Filter workspaces by name..." filtering>
      <List.EmptyView icon={Icon.EyeDisabled} title="No workspace files found" />
      <List.Section title="Favorites">
        {workspaceFavorites.map(({ title, path: filePath }) => (
          <List.Item
            key={title}
            icon={Icon.Star}
            title={getWorkspaceName(filePath)}
            subtitle={`~/${path.relative(os.homedir(), filePath)}`}
            actions={<ActionItems filePath={filePath} />}
          />
        ))}
      </List.Section>

      <List.Section title="Workspaces">
        {workspaceFiles?.map((filePath) => {
          const isFavorite = workspaceFavorites.some((favorite) => favorite.path === filePath);
          return (
            <List.Item
              key={filePath}
              icon={isFavorite ? Icon.Star : Icon.AppWindowSidebarLeft}
              title={getWorkspaceName(filePath)}
              subtitle={`~/${path.relative(os.homedir(), filePath)}`}
              actions={<ActionItems filePath={filePath} />}
            />
          );
        })}
      </List.Section>
    </List>
  );
}
