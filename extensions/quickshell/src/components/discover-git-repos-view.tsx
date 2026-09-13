import { Action, ActionPanel, environment, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import WorkspaceForm from "./workspace-form";
import UnsupportedPlatformView from "./unsupported-platform-view";
import { detectCompanionSeed } from "../lib/companion-detection";
import { detectDevServerUrl } from "../lib/detect-dev-server-url";
import { createWorkspaceFromDiscoveredGitRepo } from "../lib/discovered-workspace-seed";
import { resolveWorkspaceSetupSuggestions } from "../lib/suggest-commands";
import {
  discoverGitReposCached,
  discoverGitReposForQueryAsync,
  type GitRepoCandidate,
} from "../lib/git-repo-discovery";
import { searchRootsFromWorkspaces } from "../lib/git-repo-search-roots";
import { getQuickShellStorage } from "../lib/raycast-storage";
import { showStorageFailure } from "../lib/failure-feedback";
import { isSupportedPlatform } from "../lib/platform";
import { useLoadErrorToast } from "../lib/use-load-error-toast";
import type { Workspace } from "../lib/schema";

type ReviewWorkspaceFormProps = {
  directory: string;
  name: string;
  remoteUrl?: string | null;
  onCreated: (workspace: Workspace) => Promise<void>;
};

/** Full seed for every repository selected from Discover Git Repos. */
async function buildWorkspaceFromRepo(directory: string, name: string, remoteUrl?: string | null): Promise<Workspace> {
  const resolved = await resolveWorkspaceSetupSuggestions(directory, [], Date.now(), environment.assetsPath);
  return createWorkspaceFromDiscoveredGitRepo({
    directory,
    name,
    remoteUrl,
    devServerUrl: detectDevServerUrl(directory),
    tasks: resolved.tasks,
    companionSeed: detectCompanionSeed(directory),
  });
}

function ReviewWorkspaceForm({ directory, name, remoteUrl, onCreated }: ReviewWorkspaceFormProps) {
  const {
    data: initialWorkspace,
    isLoading,
    error,
  } = usePromise(async () => buildWorkspaceFromRepo(directory, name, remoteUrl));

  useLoadErrorToast(error, "Failed to prepare workspace");

  if (error) {
    return (
      <List>
        <List.EmptyView icon={Icon.ExclamationMark} title="Workspace prep failed" description={error.message} />
      </List>
    );
  }

  if (!initialWorkspace) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView title="Preparing workspace…" description="Loading suggestions for this repository." />
      </List>
    );
  }

  return (
    <WorkspaceForm mode="create" initialWorkspace={initialWorkspace} directorySeedMode="full" onCreated={onCreated} />
  );
}

type DiscoverGitReposViewProps = {
  onWorkspaceAdded?: (workspace: Workspace) => Promise<void> | void;
  /** When false, stay mounted after add (hub root discover). Default true for Action.Push. */
  popOnAdd?: boolean;
};

function discoveryContextForWorkspaces(workspaces: Workspace[]) {
  return {
    existingDirs: new Set(workspaces.map((workspace) => workspace.directory.toLowerCase())),
    extraRoots: searchRootsFromWorkspaces(workspaces.map((workspace) => workspace.directory)),
  };
}

export default function DiscoverGitReposView({ onWorkspaceAdded, popOnAdd = true }: DiscoverGitReposViewProps) {
  const [searchText, setSearchText] = useState("");
  const [targetedSearch, setTargetedSearch] = useState<{ query: string; repos: GitRepoCandidate[] } | null>(null);
  const [targetedLoadingQuery, setTargetedLoadingQuery] = useState<string | null>(null);
  const [addedDirectoryKeys, setAddedDirectoryKeys] = useState<Set<string>>(() => new Set());
  const [pendingQuickAddKeys, setPendingQuickAddKeys] = useState<Set<string>>(() => new Set());
  const pendingQuickAddKeysRef = useRef(new Set<string>());
  const { pop } = useNavigation();
  const storage = getQuickShellStorage();

  const { data, isLoading, error, revalidate } = usePromise(async () => {
    const existing = await storage.getWorkspaces();
    const { existingDirs, extraRoots } = discoveryContextForWorkspaces(existing);
    const repos = await discoverGitReposCached(extraRoots);
    return repos.filter((repo) => !existingDirs.has(repo.directory.toLowerCase()));
  }, []);

  useLoadErrorToast(error, "Failed to scan git repositories");

  useEffect(() => {
    if (!data) {
      return;
    }

    const cachedKeys = new Set(data.map((repo) => repo.directory.toLowerCase()));
    setAddedDirectoryKeys((current) => {
      const next = new Set([...current].filter((key) => cachedKeys.has(key)));
      return next.size === current.size ? current : next;
    });
  }, [data]);

  useEffect(() => {
    const query = searchText.trim();
    setTargetedLoadingQuery(null);
    if (!query) {
      setTargetedSearch(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setTargetedLoadingQuery(query);
      void (async () => {
        try {
          const existing = await storage.getWorkspaces();
          const { existingDirs, extraRoots } = discoveryContextForWorkspaces(existing);
          const repos = (await discoverGitReposForQueryAsync(query, extraRoots, { signal: controller.signal })).filter(
            (repo) => !existingDirs.has(repo.directory.toLowerCase()),
          );
          if (!cancelled) {
            setTargetedSearch({ query, repos });
          }
        } catch (searchError) {
          if (!cancelled) {
            setTargetedSearch({ query, repos: [] });
            await showStorageFailure("Search git repositories", searchError);
          }
        } finally {
          if (!cancelled) {
            setTargetedLoadingQuery(null);
          }
        }
      })();
    }, 250);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [searchText]);

  const filtered = useMemo(() => {
    const cached = data ?? [];
    const cachedVisible = cached.filter((repo) => !addedDirectoryKeys.has(repo.directory.toLowerCase()));
    const query = searchText.trim().toLowerCase();
    if (!query) {
      return cachedVisible;
    }
    const cachedMatches = cachedVisible.filter(
      (repo) =>
        repo.name.toLowerCase().includes(query) ||
        repo.directory.toLowerCase().includes(query) ||
        (repo.remoteUrl ?? "").toLowerCase().includes(query),
    );
    const targetedMatches = targetedSearch?.query === searchText.trim() ? targetedSearch.repos : [];
    const seen = new Set(cachedMatches.map((repo) => repo.directory.toLowerCase()));
    return [
      ...cachedMatches,
      ...targetedMatches.filter((repo) => {
        const key = repo.directory.toLowerCase();
        if (addedDirectoryKeys.has(key) || seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      }),
    ];
  }, [addedDirectoryKeys, data, searchText, targetedSearch]);

  async function finishAdd(workspace: Workspace) {
    const addedKey = workspace.directory.toLowerCase();
    setAddedDirectoryKeys((current) => new Set(current).add(addedKey));
    setTargetedSearch((current) =>
      current ? { ...current, repos: current.repos.filter((repo) => repo.directory.toLowerCase() !== addedKey) } : null,
    );
    try {
      await revalidate();
    } catch (refreshError) {
      await showStorageFailure("Refresh git repositories", refreshError);
    }
    await onWorkspaceAdded?.(workspace);
    if (popOnAdd) {
      pop();
    }
  }

  async function handleQuickAdd(directory: string, name: string, remoteUrl?: string | null) {
    const pendingKey = directory.toLowerCase();
    if (pendingQuickAddKeysRef.current.has(pendingKey)) {
      return;
    }
    pendingQuickAddKeysRef.current.add(pendingKey);
    setPendingQuickAddKeys((current) => new Set(current).add(pendingKey));
    try {
      const workspace = await buildWorkspaceFromRepo(directory, name, remoteUrl);
      await storage.upsertWorkspace(workspace);
      await showToast({
        style: Toast.Style.Success,
        title: "Workspace added",
        message: workspace.name,
      });
      await finishAdd(workspace);
    } catch (addError) {
      await showStorageFailure("Add workspace", addError);
    } finally {
      pendingQuickAddKeysRef.current.delete(pendingKey);
      setPendingQuickAddKeys((current) => {
        const next = new Set(current);
        next.delete(pendingKey);
        return next;
      });
    }
  }

  if (!isSupportedPlatform()) {
    return <UnsupportedPlatformView />;
  }

  return (
    <List
      isLoading={isLoading || targetedLoadingQuery === searchText.trim()}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search discovered git repositories..."
      throttle
    >
      {error && filtered.length === 0 ? (
        <List.EmptyView icon={Icon.ExclamationMark} title="Discovery failed" description={error.message} />
      ) : null}

      {!error && filtered.length === 0 ? (
        <List.EmptyView
          title={
            isLoading || targetedLoadingQuery === searchText.trim() ? "Searching folders..." : "No repositories found"
          }
          description="Type a repository name or an absolute path to run a targeted search beyond the cached results."
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
                title={pendingQuickAddKeys.has(repo.directory.toLowerCase()) ? "Adding…" : "Add Workspace"}
                icon={Icon.Plus}
                onAction={() => {
                  if (pendingQuickAddKeys.has(repo.directory.toLowerCase())) {
                    return;
                  }
                  void handleQuickAdd(repo.directory, repo.name, repo.remoteUrl);
                }}
              />
              <Action.Push
                title="Review Before Adding"
                icon={Icon.Pencil}
                target={
                  <ReviewWorkspaceForm
                    key={repo.directory}
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
