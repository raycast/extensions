import React from "react";
import { List, ActionPanel, Action, Icon, showToast, Toast, confirmAlert, Alert, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { withAccessToken, getAccessToken, showFailureToast } from "@raycast/utils";
import Service, { UserRepository } from "./service";
import { githubOAuth } from "./github-oauth";
import { AddRepositoryForm } from "./add-repository-form";
import { RepositoryDetailsWithAuth } from "./repository-details-oauth";

function ManageReposWithAuth() {
  const [repos, setRepos] = useState<UserRepository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const { push } = useNavigation();
  const { token } = getAccessToken();

  function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  }

  useEffect(() => {
    loadRepos();
  }, []);

  async function loadRepos() {
    try {
      setIsLoading(true);
      const userRepos = await Service.getUserRepositories();
      setRepos(userRepos);
    } catch (error) {
      showFailureToast(error, { title: "Failed to load repositories" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSyncAllRepos() {
    if (!token) {
      showToast({
        style: Toast.Style.Failure,
        title: "Authentication Required",
        message: "Please authenticate with GitHub first",
      });
      return;
    }

    const confirmed = await confirmAlert({
      title: "Sync All Repositories",
      message: `Are you sure you want to sync all ${repos.length} repositories? This may take a while.`,
      primaryAction: {
        title: "Sync All",
        style: Alert.ActionStyle.Default,
      },
    });

    if (!confirmed) return;

    try {
      setIsLoading(true);
      showToast({
        style: Toast.Style.Animated,
        title: "Syncing All Repositories",
        message: `Starting sync for ${repos.length} repositories...`,
      });

      let totalSuccess = 0;
      let totalFailed = 0;
      const results = [];

      for (const repo of repos) {
        try {
          const result = await Service.syncRepositoryFiles(repo, token);
          totalSuccess += result.success;
          totalFailed += result.failed;
          results.push({ repo: `${repo.owner}/${repo.name}`, success: result.success, failed: result.failed });
        } catch (error) {
          totalFailed++;
          results.push({ repo: `${repo.owner}/${repo.name}`, success: 0, failed: 1, error: error.message });
          console.warn(`Failed to sync ${repo.owner}/${repo.name}:`, error);
        }
      }

      // Reload repositories to update lastSyncedAt timestamps
      await loadRepos();

      showToast({
        style: Toast.Style.Success,
        title: "Sync Complete",
        message: `Synced ${totalSuccess} cheatsheets from ${repos.length} repositories${totalFailed > 0 ? ` (${totalFailed} failed)` : ""}`,
      });

      // Log detailed results
      console.log("Sync All Results:", results);
    } catch (error) {
      showFailureToast(error, { title: "Failed to sync all repositories" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteRepo(id: string, name: string, owner: string) {
    const confirmed = await confirmAlert({
      title: "Remove Repository",
      message: `Are you sure you want to remove "${owner}/${name}" from your repositories?`,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await Service.removeUserRepository(id);
        await loadRepos();
      } catch (err) {
        showFailureToast(err, { title: "Failed to remove repository" });
      }
    }
  }

  const filteredRepos = repos.filter(
    (repo) =>
      repo.name.toLowerCase().includes(searchText.toLowerCase()) ||
      repo.owner.toLowerCase().includes(searchText.toLowerCase()) ||
      repo.description?.toLowerCase().includes(searchText.toLowerCase()),
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search repositories..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadRepos} />
          <Action
            title="Sync All Repositories"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
            onAction={handleSyncAllRepos}
          />
          <Action
            title="Add Repository"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() => push(<AddRepositoryForm onAdded={loadRepos} />)}
          />
        </ActionPanel>
      }
    >
      <List.Section title="Your Repositories" subtitle={`${filteredRepos.length} repositories`} />
      {filteredRepos.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Box}
          title="No repositories found"
          description={
            searchText ? `No repositories match "${searchText}"` : "Add your first repository to get started"
          }
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadRepos} />
              <Action title="Sync All Repositories" icon={Icon.ArrowClockwise} onAction={handleSyncAllRepos} />
              <Action
                title="Add Repository"
                icon={Icon.Plus}
                onAction={() => push(<AddRepositoryForm onAdded={loadRepos} />)}
              />
            </ActionPanel>
          }
        />
      ) : (
        filteredRepos.map((repo) => (
          <List.Item
            key={repo.id}
            title={repo.name}
            subtitle={repo.description || `${repo.owner}/${repo.name}`}
            icon={repo.isPrivate ? Icon.Lock : Icon.Globe}
            accessories={[
              { text: repo.owner, icon: { source: `https://github.com/${repo.owner}.png`, fallback: Icon.Person } },
              { text: repo.defaultBranch, icon: Icon.Code },
              ...(repo.subdirectory ? [{ text: repo.subdirectory, icon: Icon.Folder }] : []),
              ...(repo.lastSyncedAt
                ? [{ text: formatRelativeTime(repo.lastSyncedAt), icon: Icon.ArrowClockwise }]
                : []),
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Repository Actions">
                  <Action.Push
                    title="View Details"
                    icon={Icon.Window}
                    target={<RepositoryDetailsWithAuth repo={repo} onUpdated={loadRepos} />}
                  />
                  <Action.OpenInBrowser
                    title="Open in Browser"
                    url={repo.url}
                    icon={Icon.Globe}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={repo.url}
                    icon={Icon.CopyClipboard}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action
                    title="Sync Repository"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={async () => {
                      try {
                        await Service.syncRepositoryFiles(repo, token);
                        await loadRepos();
                      } catch (error) {
                        showFailureToast(error, { title: "Failed to sync repository" });
                      }
                    }}
                  />
                  <Action
                    title="Sync All Repositories"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                    onAction={handleSyncAllRepos}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Manage">
                  <Action.Push
                    title="Edit Repository"
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    target={<EditRepositoryForm repo={repo} onUpdated={loadRepos} />}
                  />
                  <Action
                    title="Remove Repository"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDeleteRepo(repo.id, repo.name, repo.owner)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

// Import the components we need
import { EditRepositoryForm } from "./edit-repository-form";

// Export the OAuth-wrapped component
export default withAccessToken(githubOAuth)(ManageReposWithAuth);
