import path from "node:path";
import { useEffect, useState } from "react";

import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  List,
  openCommandPreferences,
  type Application,
} from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";

import { openDirectoryInEditor } from "./utils/editor";
import { openWorkspace } from "./utils/ghostty-api";
import { launchConfigToWorkspaceLayouts } from "./utils/launch-config-converter";
import { loadStoredLaunchConfigs, type StoredLaunchConfig } from "./utils/launch-configs";
import { expandHome, toTildePath } from "./utils/paths";

import type { ChildDirectory } from "./utils/types";
import { listChildDirectories } from "./utils/workspaces";

type WorkspaceSortOrder = "name" | "lastModified" | "path";

export default function Command() {
  const prefs = getPreferences();
  const [storedSortOrder, setStoredSortOrder] = useCachedState<string>("open-ghostty-workspace-sort-order", "name");
  const sortOrder = normalizeSortOrder(storedSortOrder);
  const {
    data: repos,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    (parentDir: string | null, depth: number) =>
      parentDir ? listChildDirectories(parentDir, { maxDepth: depth }) : Promise.resolve([]),
    [prefs.parentDirectory, prefs.maxDepth],
    { keepPreviousData: true },
  );
  const [configs, setConfigs] = useState<StoredLaunchConfig[]>([]);

  useEffect(() => {
    let active = true;
    loadStoredLaunchConfigs({ directoryOverrideCompatibleOnly: true }).then((data) => {
      if (active) setConfigs(data);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!prefs.parentDirectory) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Folder}
          title="Configure parent directory"
          description="Set Workspaces Parent Directory in extension preferences to scan for git repos."
          actions={
            <ActionPanel>
              <Action title="Open Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const reposList = sortRepositories(repos ?? [], sortOrder);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Git Repos in ${path.basename(prefs.parentDirectory) || prefs.parentDirectory}`}
      searchBarPlaceholder="Search repositories"
      searchBarAccessory={
        <List.Dropdown tooltip="Sort Repositories" value={sortOrder} onChange={setStoredSortOrder}>
          <List.Dropdown.Item title="Name" value="name" />
          <List.Dropdown.Item title="Last Modified" value="lastModified" />
          <List.Dropdown.Item title="Path" value="path" />
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Couldn't read directory"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
              <Action title="Open Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
            </ActionPanel>
          }
        />
      ) : null}

      {!error && reposList.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="No git repositories found"
          description="Try increasing the scan depth or choose a different parent directory."
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
              <Action title="Open Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
            </ActionPanel>
          }
        />
      ) : null}

      {reposList.map((repo) => (
        <List.Item
          key={repo.directory}
          icon={Icon.Folder}
          title={repo.name}
          accessories={[{ text: toTildePath(repo.directory), tooltip: "Path" }]}
          actions={
            <RepoActions repo={repo} configs={configs} editor={prefs.editorApplication} onRefresh={revalidate} />
          }
        />
      ))}
    </List>
  );
}

function RepoActions({
  repo,
  configs,
  editor,
  onRefresh,
}: {
  repo: ChildDirectory;
  configs: StoredLaunchConfig[];
  editor: Application | string | undefined;
  onRefresh: () => void;
}) {
  return (
    <ActionPanel>
      {configs.length === 0 ? (
        <Action.Open
          title="Create Launch Configuration"
          icon={Icon.Plus}
          target="raycast://extensions/jarry_chung/ghostty/open-ghostty-launch-configuration"
        />
      ) : (
        configs.map((lc) => (
          <Action
            key={lc.name}
            title={lc.name}
            icon={Icon.Terminal}
            onAction={() => runLaunchConfigWithRepo(lc, repo)}
          />
        ))
      )}
      {editor ? (
        <Action
          title="Open in Editor"
          icon={getEditorIcon(editor)}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          onAction={() => openDirectoryInEditor(repo.directory, editor)}
        />
      ) : null}
      <ActionPanel.Section>
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={onRefresh}
        />
        <Action title="Open Command Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

async function runLaunchConfigWithRepo(stored: StoredLaunchConfig, repo: ChildDirectory) {
  const targets = launchConfigToWorkspaceLayouts(stored.config, {
    directoryOverride: repo.directory,
  });

  for (const { layout } of targets) {
    await openWorkspace({
      title: `${stored.name} — ${repo.name}`,
      directory: repo.directory,
      layout,
    });
  }
}

function getPreferences() {
  const prefs = getPreferenceValues<Preferences.OpenGhosttyWorkspace>();

  const maxDepth = Number.parseInt(String(prefs.workspaceScanDepth ?? "3"), 10);
  const rawDir = prefs.workspaceParentDirectory?.trim();
  const parentDirectory = rawDir ? expandHome(rawDir) : null;

  return {
    parentDirectory,
    maxDepth: Number.isNaN(maxDepth) ? 3 : Math.max(1, maxDepth),
    editorApplication: prefs.editorApplication,
  };
}

function sortRepositories(repos: ChildDirectory[], sortOrder: WorkspaceSortOrder) {
  const collator = new Intl.Collator("en-US", { numeric: true, sensitivity: "base" });
  const sorted = [...repos];

  switch (sortOrder) {
    case "lastModified":
      return sorted.sort((a, b) => b.lastModified - a.lastModified || collator.compare(a.name, b.name));
    case "path":
      return sorted.sort((a, b) => collator.compare(a.directory, b.directory) || collator.compare(a.name, b.name));
    case "name":
    default:
      return sorted.sort((a, b) => collator.compare(a.name, b.name) || collator.compare(a.directory, b.directory));
  }
}

function normalizeSortOrder(value: string): WorkspaceSortOrder {
  switch (value) {
    case "lastModified":
    case "path":
    case "name":
      return value;
    default:
      return "name";
  }
}

function getEditorIcon(editor: Application | string) {
  if (typeof editor === "string") {
    return Icon.Code;
  }

  if (editor.path) {
    return { fileIcon: editor.path };
  }

  return Icon.Code;
}
