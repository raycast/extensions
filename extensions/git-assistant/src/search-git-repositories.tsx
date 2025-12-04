import { List, ActionPanel, Action, Icon, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise, showFailureToast } from "@raycast/utils";
import { useState } from "react";
import RepoService, { abbreviateHome, Repo } from "./utils";

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");

  const { data: scanDirs = [], isLoading: dirsLoading } = useCachedPromise(RepoService.getScanDirectories, [], {
    onError: (error) => {
      showFailureToast(error, { title: "Could not load scan directories" });
    },
    keepPreviousData: true,
  });

  const {
    data: repos = [],
    isLoading: reposLoading,
    revalidate,
  } = useCachedPromise(RepoService.listAll, [], {
    onError: (error) => {
      showFailureToast(error, { title: "Could not load repositories" });
    },
    keepPreviousData: true,
  });

  const { data: favorites = [], revalidate: reloadFav } = useCachedPromise(RepoService.getFavorites, [], {
    onError: (error) => {
      showFailureToast(error, { title: "Could not load favorites" });
    },
    keepPreviousData: true,
  });

  if (scanDirs.length === 0) {
    return (
      <List isLoading={dirsLoading}>
        <List.EmptyView
          title="No scan directories configured"
          description="Configure 'Scan Directories' in Preferences"
          actions={
            <ActionPanel>
              <Action title="Configure Scan Directories" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const favRepos = repos.filter((r: Repo) => favorites.includes(r.fullPath));

  const otherRepos = searchText
    ? repos.filter(
        (r: Repo) => !favorites.includes(r.fullPath) && r.name.toLowerCase().includes(searchText.toLowerCase()),
      )
    : repos.filter((r: Repo) => !favorites.includes(r.fullPath));

  return (
    <List
      isLoading={reposLoading}
      filtering={{ keepSectionOrder: true }}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Git repositories..."
      throttle
    >
      {favRepos.length > 0 && (
        <List.Section title="Favorites" subtitle={String(favRepos.length)}>
          {favRepos.map((repo: Repo) => (
            <RepoListItem
              key={repo.fullPath}
              repo={repo}
              isFavorite
              onToggleFavorite={async () => {
                try {
                  await RepoService.toggleFavorite(repo.fullPath);
                  reloadFav();
                  revalidate();
                } catch (error) {
                  showFailureToast(error, { title: "Could not toggle favorite" });
                }
              }}
            />
          ))}
        </List.Section>
      )}

      {otherRepos.length > 0 ? (
        <List.Section title="Repositories" subtitle={String(otherRepos.length)}>
          {otherRepos.map((repo: Repo) => (
            <RepoListItem
              key={repo.fullPath}
              repo={repo}
              isFavorite={false}
              onToggleFavorite={async () => {
                try {
                  await RepoService.toggleFavorite(repo.fullPath);
                  reloadFav();
                  revalidate();
                } catch (error) {
                  showFailureToast(error, { title: "Could not toggle favorite" });
                }
              }}
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView title="No repositories found" description="Make sure your scan directories are set correctly" />
      )}
    </List>
  );
}

function RepoListItem(props: { repo: Repo; isFavorite: boolean; onToggleFavorite: () => void }) {
  const { repo, isFavorite, onToggleFavorite } = props;
  return (
    <List.Item
      title={repo.name}
      subtitle={abbreviateHome(repo.fullPath)}
      icon={isFavorite ? Icon.Star : Icon.Circle}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Open title="Open in Finder" target={repo.fullPath} />
            <Action.OpenWith
              title="Open in Other Apps"
              path={repo.fullPath}
              icon={Icon.AppWindow}
              shortcut={{ modifiers: ["cmd"], key: "enter" }}
            />
            <Action.CopyToClipboard
              title="Copy Path"
              content={repo.fullPath}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
            <Action
              title={isFavorite ? "Remove Favorite" : "Add to Favorites"}
              icon={isFavorite ? Icon.StarDisabled : Icon.Star}
              onAction={onToggleFavorite}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            />
          </ActionPanel.Section>
          <Action title="Configure Scan Directories" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
