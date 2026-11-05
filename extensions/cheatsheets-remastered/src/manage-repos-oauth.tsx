import { shortcut } from "./shortcuts";
import { Keyboard } from "@raycast/api";
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
  const [loadError, setLoadError] = useState<string | null>(null);
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
      setLoadError(null);
      const userRepos = await Service.getUserRepositories();
      setRepos(userRepos);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Storage unavailable. Retry before making changes.");
      showFailureToast(error, { title: "Failed to load repositories" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSyncAllRepos() {
    if (isLoading) return;
    if (!token) {
      await showToast({
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
      let attempted = 0;

      for (const repo of repos) {
        attempted++;
        try {
          const result = await Service.syncRepositoryFiles(repo, token);
          totalSuccess += result.success;
          totalFailed += result.failed;
        } catch (error) {
          totalFailed++;

          await showFailureToast(error, { title: `Could Not Sync ${repo.name}` });
          if (error instanceof Error && error.name === "SyncCancelledError") break;
        }
      }

      // Reload repositories to update lastSyncedAt timestamps
      await loadRepos();

      showToast({
        style: totalFailed ? Toast.Style.Failure : Toast.Style.Success,
        title: totalFailed ? "Some Repositories Were Not Synced" : "Sync Complete",
        message: `Saved ${totalSuccess} sheets; ${totalFailed} repositories failed; ${repos.length - attempted} not attempted.`,
      });
    } catch (error) {
      showFailureToast(error, { title: "Failed to sync all repositories" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteRepo(id: string, name: string, owner: string) {
    const confirmed = await confirmAlert({
      title: "Remove Repository",
      message: `Are you sure you want to remove "${owner}/${name}" and its cached sheets? Favorites and history will be retained.`,
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
      filtering={false}
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
            shortcut={shortcut("s", true)}
            onAction={handleSyncAllRepos}
          />
          <Action
            title="Add Repository"
            icon={Icon.Plus}
            shortcut={Keyboard.Shortcut.Common.New}
            onAction={() => push(<AddRepositoryForm onAdded={loadRepos} />)}
          />
        </ActionPanel>
      }
    >
      <List.Section title="Your Repositories" subtitle={`${filteredRepos.length} repositories`} />
      {filteredRepos.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Box}
          title={loadError ? "Storage Unavailable" : "No repositories found"}
          description={
            loadError ||
            (searchText ? `No repositories match "${searchText}"` : "Add your first repository to get started")
          }
          actions={
            <ActionPanel>
              <Action
                title="Add Repository"
                icon={Icon.Plus}
                shortcut={Keyboard.Shortcut.Common.New}
                onAction={() => push(<AddRepositoryForm onAdded={loadRepos} />)}
              />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadRepos} />
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
              { text: repo.owner, icon: Icon.Person },
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
                    shortcut={Keyboard.Shortcut.Common.Open}
                  />
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={repo.url}
                    icon={Icon.CopyClipboard}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                  <Action
                    title="Sync Repository"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={async () => {
                      if (isLoading) return;
                      setIsLoading(true);
                      try {
                        await Service.syncRepositoryFiles(repo, token);
                        await loadRepos();
                      } catch (error) {
                        showFailureToast(error, { title: "Failed to sync repository" });
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                  />
                  <Action
                    title="Sync All Repositories"
                    icon={Icon.ArrowClockwise}
                    shortcut={shortcut("s", true)}
                    onAction={handleSyncAllRepos}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Manage">
                  <Action.Push
                    title="Edit Repository"
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
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

// Keep the published OAuth entry boundary.
export default withAccessToken(githubOAuth)(ManageReposWithAuth);
