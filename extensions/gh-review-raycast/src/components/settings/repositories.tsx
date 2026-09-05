import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { useConfig, useViewer } from "../../hooks";
import { orgRepos, viewerRepos } from "../../lib/github";
import { nameWithOwner, parseRepoRef, type RepoRef } from "../../lib/types";

/**
 * Picks the repositories that feed the "Watching" category. Candidates come
 * from the active orgs, or from everything the viewer can see when no org
 * scope is set.
 */
export function Repositories() {
  const { config, update } = useConfig();
  const { data: viewer } = useViewer();

  const { data: candidates, isLoading } = useCachedPromise(
    async (orgs: string) => {
      const list = orgs ? orgs.split(",").filter(Boolean) : [];
      if (list.length === 0) return viewerRepos();
      const pages = await Promise.all(list.map((org) => orgRepos(org)));
      return pages.flat();
    },
    [config.activeOrgs.join(",")],
    { initialData: [] as RepoRef[], keepPreviousData: true, execute: Boolean(viewer) },
  );

  const watched = config.repos.map(nameWithOwner);
  const watchedSet = new Set(watched.map((r) => r.toLowerCase()));
  const unwatched = candidates.filter((r) => !watchedSet.has(nameWithOwner(r).toLowerCase()));

  async function toggle(id: string) {
    const next = watchedSet.has(id.toLowerCase())
      ? config.repos.filter((r) => nameWithOwner(r).toLowerCase() !== id.toLowerCase())
      : [...config.repos, parseRepoRef(id)].filter((r): r is RepoRef => r !== undefined);
    await update({ ...config, repos: next });
  }

  function item(id: string, isWatched: boolean) {
    return (
      <List.Item
        key={id}
        icon={
          isWatched
            ? { source: Icon.Binoculars, tintColor: Color.Purple }
            : { source: Icon.Circle, tintColor: Color.SecondaryText }
        }
        title={id}
        actions={
          <ActionPanel>
            <Action
              icon={isWatched ? Icon.EyeDisabled : Icon.Eye}
              title={isWatched ? "Stop Watching" : "Watch Repository"}
              onAction={() => toggle(id)}
            />
            <Action.OpenInBrowser title="Open on GitHub" url={`https://github.com/${id}`} />
            {watched.length > 0 ? (
              <Action
                icon={Icon.Trash}
                title="Clear All Watched Repositories"
                style={Action.Style.Destructive}
                onAction={() => update({ ...config, repos: [] })}
              />
            ) : null}
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle="Watched Repositories" searchBarPlaceholder="Filter repositories…">
      <List.EmptyView
        icon={Icon.Binoculars}
        title={isLoading ? "Loading repositories…" : "No repositories found"}
        description={isLoading ? undefined : "Pick an organization first, or check that your token can see repos."}
      />
      <List.Section title="Watching" subtitle={watched.length ? String(watched.length) : undefined}>
        {watched.map((id) => item(id, true))}
      </List.Section>
      <List.Section title="Available" subtitle={unwatched.length ? String(unwatched.length) : undefined}>
        {unwatched.map((repo) => item(nameWithOwner(repo), false))}
      </List.Section>
    </List>
  );
}
