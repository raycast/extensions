import { Action, ActionPanel, Icon, Image, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ComponentType, useEffect, useMemo } from "react";
import { getPreferences } from "../lib/preferences";
import { Repo, formatPathForDisplay, getRemoteOwnerRepo, scanRepos } from "../lib/git";
import { usePinnedRepos } from "../hooks/usePinnedRepos";

interface RepoListProps {
  /** Command-specific Action items for a given repo. Pin/reorder actions are added automatically. */
  ActionsComponent: ComponentType<{ repo: Repo }>;
}

export default function RepoList({ ActionsComponent }: RepoListProps) {
  const { rootFolder } = getPreferences();

  const { data: repos, isLoading } = useCachedPromise(async (folder: string) => scanRepos(folder), [rootFolder]);
  const { pinnedPaths, isPinned, togglePin, moveUp, moveDown, pruneToExisting } = usePinnedRepos();

  const withWorkflows = useMemo(() => (repos ?? []).filter((r) => r.hasWorkflows), [repos]);

  useEffect(() => {
    if (repos) pruneToExisting(new Set(withWorkflows.map((r) => r.path)));
  }, [repos, withWorkflows, pruneToExisting]);

  const pinnedSet = new Set(pinnedPaths);
  const pinnedRepos = pinnedPaths
    .map((p) => withWorkflows.find((r) => r.path === p))
    .filter((r): r is Repo => Boolean(r));
  const unpinnedRepos = withWorkflows.filter((r) => !pinnedSet.has(r.path));

  const emptyRoot = !rootFolder;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter repositories...">
      {emptyRoot ? (
        <List.EmptyView
          title="No Repositories Folder Configured"
          description={'Set the "Repositories Folder" preference to a folder containing your git repositories.'}
        />
      ) : !isLoading && withWorkflows.length === 0 ? (
        <List.EmptyView
          title="No Git Repositories Found"
          description={`No git repositories with a .github/workflows folder were found up to 3 levels deep in ${rootFolder}.`}
        />
      ) : (
        <>
          {pinnedRepos.length > 0 && (
            <List.Section title="Pinned">
              {pinnedRepos.map((repo) => (
                <RepoListItem
                  key={repo.path}
                  repo={repo}
                  pinned={isPinned(repo.path)}
                  pinnedIndex={pinnedRepos.findIndex((r) => r.path === repo.path)}
                  pinnedCount={pinnedRepos.length}
                  ActionsComponent={ActionsComponent}
                  togglePin={togglePin}
                  moveUp={moveUp}
                  moveDown={moveDown}
                />
              ))}
            </List.Section>
          )}
          <List.Section title={pinnedRepos.length > 0 ? "Repositories" : undefined}>
            {unpinnedRepos.map((repo) => (
              <RepoListItem
                key={repo.path}
                repo={repo}
                pinned={isPinned(repo.path)}
                pinnedIndex={pinnedRepos.findIndex((r) => r.path === repo.path)}
                pinnedCount={pinnedRepos.length}
                ActionsComponent={ActionsComponent}
                togglePin={togglePin}
                moveUp={moveUp}
                moveDown={moveDown}
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

interface RepoListItemProps {
  repo: Repo;
  pinned: boolean;
  pinnedIndex: number;
  pinnedCount: number;
  ActionsComponent: ComponentType<{ repo: Repo }>;
  togglePin: (path: string) => void;
  moveUp: (path: string) => void;
  moveDown: (path: string) => void;
}

/** Renders a single repo `List.Item`, including an org/user avatar icon resolved from the repo's `origin` remote. */
function RepoListItem({
  repo,
  pinned,
  pinnedIndex,
  pinnedCount,
  ActionsComponent,
  togglePin,
  moveUp,
  moveDown,
}: RepoListItemProps) {
  const { data: ownerRepo } = useCachedPromise(async (repoPath: string) => getRemoteOwnerRepo(repoPath), [repo.path]);

  const icon: Image.ImageLike | undefined = ownerRepo && {
    source: `https://${ownerRepo.host}/${ownerRepo.owner}.png`,
    mask: Image.Mask.Circle,
  };

  return (
    <List.Item
      icon={icon}
      title={repo.name}
      subtitle={formatPathForDisplay(repo.path)}
      actions={
        <ActionPanel>
          <ActionsComponent repo={repo} />
          {ownerRepo && (
            <ActionPanel.Section title={`${ownerRepo.owner}/${ownerRepo.repo}`}>
              <Action.OpenInBrowser url={`https://${ownerRepo.host}/${ownerRepo.owner}/${ownerRepo.repo}`} />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section title="Local Repository">
            <Action.ShowInFinder path={repo.path} shortcut={Keyboard.Shortcut.Common.Open} />
            <Action.OpenWith path={repo.path} shortcut={Keyboard.Shortcut.Common.OpenWith} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={pinned ? "Unpin Repository" : "Pin Repository"}
              icon={pinned ? Icon.PinDisabled : Icon.Pin}
              shortcut={Keyboard.Shortcut.Common.Pin}
              onAction={() => togglePin(repo.path)}
            />
            {pinned && pinnedIndex > 0 && (
              <Action
                // eslint-disable-next-line @raycast/prefer-title-case
                title="Move Up"
                icon={Icon.ArrowUp}
                shortcut={Keyboard.Shortcut.Common.MoveUp}
                onAction={() => moveUp(repo.path)}
              />
            )}
            {pinned && pinnedIndex < pinnedCount - 1 && (
              <Action
                title="Move Down"
                icon={Icon.ArrowDown}
                shortcut={Keyboard.Shortcut.Common.MoveDown}
                onAction={() => moveDown(repo.path)}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
