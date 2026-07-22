import { Action, ActionPanel, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import WorkspaceForm from "./workspace-form";
import UnsupportedPlatformView from "./unsupported-platform-view";
import { detectCompanionSeed } from "../lib/companion-detection";
import { detectDevServerUrl } from "../lib/detect-dev-server-url";
import { buildProjectSetupSuggestions } from "../lib/project-setup-suggestion";
import { discoverGitReposCached } from "../lib/git-repo-discovery";
import { searchRootsFromWorkspaces } from "../lib/git-repo-search-roots";
import { deriveAbbreviationFromName, deriveNameFromDirectory } from "../lib/directory-helpers";
import { tryGetGitRemoteUrl } from "../lib/git-remote-url";
import { getQuickShellStorage } from "../lib/raycast-storage";
import { showStorageFailure } from "../lib/failure-feedback";
import { isSupportedPlatform } from "../lib/platform";
import { useLoadErrorToast } from "../lib/use-load-error-toast";
import { launchRowsFromSuggestions } from "../lib/workspace-form-state";
import { normalizeWorkspace } from "../lib/validation";
import { createStableId } from "../lib/ids";
import type { Workspace } from "../lib/schema";

type ReviewWorkspaceFormProps = {
  directory: string;
  name: string;
  remoteUrl?: string | null;
  onCreated: (workspace: Workspace) => Promise<void>;
};

/** Full seed for Review: launches, companions, remotes, project suggestions. */
function buildWorkspaceFromRepo(directory: string, name: string, remoteUrl?: string | null): Workspace {
  const suggestions = buildProjectSetupSuggestions(directory);
  const rows = launchRowsFromSuggestions(suggestions);
  const launchEntries =
    rows.length > 0
      ? rows.map((row, index) => ({
          id: row.id,
          label: row.label,
          terminal: row.terminal,
          wtProfile: row.wtProfile ?? null,
          command: row.command || null,
          runAsAdmin: row.runAsAdmin,
          isEnabled: row.isEnabled,
          order: index,
          taskType: "none" as const,
        }))
      : [
          {
            id: createStableId(),
            label: "Launch",
            terminal: "default" as const,
            wtProfile: null,
            command: null,
            runAsAdmin: false,
            isEnabled: true,
            order: 0,
            taskType: "none" as const,
          },
        ];
  const derivedName = name || deriveNameFromDirectory(directory);
  const companionSeed = detectCompanionSeed(directory);
  const resolvedRemote = remoteUrl ?? tryGetGitRemoteUrl(directory);
  return normalizeWorkspace({
    id: createStableId(),
    name: derivedName,
    abbreviation: deriveAbbreviationFromName(derivedName),
    directory,
    isPinned: false,
    pinOrder: null,
    lastUsedUtc: null,
    terminal: "default",
    wtProfile: null,
    command: null,
    runAsAdmin: false,
    repoUrl: resolvedRemote,
    devServerUrl: detectDevServerUrl(directory),
    launches: launchEntries,
    companionApps: companionSeed
      ? [
          {
            id: createStableId(),
            path: companionSeed.path,
            arguments: companionSeed.arguments || null,
            openOnLaunch: true,
            order: 0,
          },
        ]
      : [],
  });
}

/** One-click Quick Add: blank launch row only, no deep project/companion walk. */
function buildLightWorkspaceFromRepo(directory: string, name: string, remoteUrl?: string | null): Workspace {
  const derivedName = name || deriveNameFromDirectory(directory);
  const resolvedRemote = remoteUrl ?? tryGetGitRemoteUrl(directory);
  return normalizeWorkspace({
    id: createStableId(),
    name: derivedName,
    abbreviation: deriveAbbreviationFromName(derivedName),
    directory,
    isPinned: false,
    pinOrder: null,
    lastUsedUtc: null,
    terminal: "default",
    wtProfile: null,
    command: null,
    runAsAdmin: false,
    repoUrl: resolvedRemote,
    devServerUrl: null,
    launches: [
      {
        id: createStableId(),
        label: "Launch",
        terminal: "default",
        wtProfile: null,
        command: null,
        runAsAdmin: false,
        isEnabled: true,
        order: 0,
        taskType: "none",
      },
    ],
    companionApps: [],
  });
}

function ReviewWorkspaceForm({ directory, name, remoteUrl, onCreated }: ReviewWorkspaceFormProps) {
  const initialWorkspace = useMemo(
    () => buildWorkspaceFromRepo(directory, name, remoteUrl),
    [directory, name, remoteUrl],
  );

  return (
    <WorkspaceForm mode="create" initialWorkspace={initialWorkspace} directorySeedMode="full" onCreated={onCreated} />
  );
}

type DiscoverGitReposViewProps = {
  onWorkspaceAdded?: (workspace: Workspace) => Promise<void> | void;
  /** When false, stay mounted after add (hub root discover). Default true for Action.Push. */
  popOnAdd?: boolean;
};

export default function DiscoverGitReposView({ onWorkspaceAdded, popOnAdd = true }: DiscoverGitReposViewProps) {
  const [searchText, setSearchText] = useState("");
  const { pop } = useNavigation();
  const storage = getQuickShellStorage();

  const { data, isLoading, error, revalidate } = usePromise(async () => {
    const existing = await storage.getWorkspaces();
    const extraRoots = searchRootsFromWorkspaces(existing.map((workspace) => workspace.directory));
    const repos = await discoverGitReposCached(extraRoots);
    const existingDirs = new Set(existing.map((workspace) => workspace.directory.toLowerCase()));
    return repos.filter((repo) => !existingDirs.has(repo.directory.toLowerCase()));
  }, []);

  useLoadErrorToast(error, "Failed to scan git repositories");

  const filtered = useMemo(() => {
    if (!data) {
      return [];
    }
    const query = searchText.trim().toLowerCase();
    if (!query) {
      return data;
    }
    return data.filter(
      (repo) =>
        repo.name.toLowerCase().includes(query) ||
        repo.directory.toLowerCase().includes(query) ||
        (repo.remoteUrl ?? "").toLowerCase().includes(query),
    );
  }, [data, searchText]);

  async function finishAdd(workspace: Workspace) {
    await revalidate();
    await onWorkspaceAdded?.(workspace);
    if (popOnAdd) {
      pop();
    }
  }

  async function handleQuickAdd(directory: string, name: string, remoteUrl?: string | null) {
    try {
      const workspace = buildLightWorkspaceFromRepo(directory, name, remoteUrl);
      await storage.upsertWorkspace(workspace);
      await showToast({
        style: Toast.Style.Success,
        title: "Workspace added",
        message: workspace.name,
      });
      await finishAdd(workspace);
    } catch (addError) {
      await showStorageFailure("Add workspace", addError);
    }
  }

  if (!isSupportedPlatform()) {
    return <UnsupportedPlatformView />;
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search discovered git repositories..."
      throttle
    >
      {error ? (
        <List.EmptyView icon={Icon.ExclamationMark} title="Discovery failed" description={error.message} />
      ) : null}

      {!error && filtered.length === 0 ? (
        <List.EmptyView
          title={isLoading ? "Scanning folders..." : "No repositories found"}
          description="Quick Shell scans common project folders on each drive, plus folders near your saved workspaces."
        />
      ) : null}

      {filtered.map((repo) => (
        <List.Item
          key={repo.directory}
          title={repo.name}
          subtitle={repo.directory}
          icon={Icon.Folder}
          actions={
            <ActionPanel>
              <Action
                title="Add Workspace"
                icon={Icon.Plus}
                onAction={() => handleQuickAdd(repo.directory, repo.name, repo.remoteUrl)}
              />
              <Action.Push
                title="Review Before Adding"
                icon={Icon.Pencil}
                target={
                  <ReviewWorkspaceForm
                    directory={repo.directory}
                    name={repo.name}
                    remoteUrl={repo.remoteUrl}
                    onCreated={finishAdd}
                  />
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
