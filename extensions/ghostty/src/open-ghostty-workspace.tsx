import path from "node:path";
import { useEffect, useState } from "react";

import { Action, ActionPanel, getPreferenceValues, Icon, List, openCommandPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { openDirectoryInEditor } from "./utils/editor";
import { openWorkspace } from "./utils/ghostty-api";
import { loadStoredLaunchConfigs, type StoredLaunchConfig } from "./utils/launch-configs";
import { launchConfigToWorkspaceLayouts } from "./utils/launch-config-converter";
import { expandHome, toTildePath } from "./utils/paths";

import type { ChildDirectory } from "./utils/types";
import { listChildDirectories } from "./utils/workspaces";

export default function Command() {
  const prefs = getPreferences();
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
    loadStoredLaunchConfigs({ directoryOverrideCompatibleOnly: true }).then(setConfigs);
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

  const reposList = repos ?? [];

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Git Repos in ${path.basename(prefs.parentDirectory) || prefs.parentDirectory}`}
      searchBarPlaceholder="Search repositories"
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
          accessories={[{ text: toTildePath(repo.directory) }]}
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
  editor: { path?: string; bundleId?: string; name?: string } | string | undefined;
  onRefresh: () => void;
}) {
  return (
    <ActionPanel>
      {configs.length === 0 ? (
        <Action title="No Launch Configurations" icon={Icon.ExclamationMark} onAction={() => {}} />
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
          icon={Icon.Code}
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
  const prefs = getPreferenceValues<{
    workspaceParentDirectory?: string;
    workspaceScanDepth?: string;
    editorApplication?: { path?: string; bundleId?: string; name?: string } | string;
  }>();

  const maxDepth = Number.parseInt(String(prefs.workspaceScanDepth ?? "3"), 10);
  const rawDir = prefs.workspaceParentDirectory?.trim();
  const parentDirectory = rawDir ? expandHome(rawDir) : null;

  return {
    parentDirectory,
    maxDepth: Number.isNaN(maxDepth) ? 3 : Math.max(1, maxDepth),
    editorApplication: prefs.editorApplication,
  };
}
