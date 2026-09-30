import React from "react";
import { Detail, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { showFailureToast } from "@raycast/utils";
import Service, { UserRepository } from "./service";

export function RepositoryDetails({ repo, onUpdated }: { repo: UserRepository; onUpdated?: () => void }) {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Record access when component mounts
    Service.recordRepositoryAccess(repo.id);
  }, [repo.id]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const markdown = `# ${repo.name}

**Owner:** ${repo.owner}  
**Repository:** ${repo.name}  
**URL:** ${repo.url}  
**Default Branch:** ${repo.defaultBranch}  
**Visibility:** ${repo.isPrivate ? "Private" : "Public"}  
${repo.subdirectory ? `**Subdirectory:** ${repo.subdirectory}` : ""}  
**Added:** ${formatDate(repo.addedAt)}  
${repo.lastAccessedAt ? `**Last Accessed:** ${formatDate(repo.lastAccessedAt)}` : ""}  
${repo.lastSyncedAt ? `**Last Synced:** ${formatDate(repo.lastSyncedAt)}` : "**Never Synced**"}

${repo.description ? `## Description\n\n${repo.description}` : ""}

## Quick Actions

Use the actions below to interact with this repository:

- **Open in Browser** - View the repository on GitHub
- **Copy URL** - Copy the repository URL to clipboard
- **Sync Repository** - Fetch cheatsheet files from GitHub
- **Edit Repository** - Modify repository details
- **Remove Repository** - Remove from your collection
`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Repository Actions">
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
            <Action.CopyToClipboard
              title="Copy Clone URL"
              content={`git clone ${repo.url}.git`}
              icon={Icon.Terminal}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action
              title="Sync Repository"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={async () => {
                setIsLoading(true);
                try {
                  // Note: This component doesn't have OAuth access, so sync is not available
                  showToast({
                    style: Toast.Style.Failure,
                    title: "Sync Not Available",
                    message: "Please use the OAuth-enabled Repo Manager for syncing",
                  });
                  if (onUpdated) {
                    onUpdated();
                  }
                } catch (error) {
                  showFailureToast(error, { title: "Failed to sync repository" });
                } finally {
                  setIsLoading(false);
                }
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Manage">
            <Action.Push
              title="Edit Repository"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              target={<EditRepositoryForm repo={repo} onUpdated={onUpdated} />}
            />
            <Action
              title="Refresh Details"
              icon={Icon.ArrowClockwise}
              onAction={async () => {
                setIsLoading(true);
                try {
                  const updatedRepo = await Service.getUserRepository(repo.id);
                  if (updatedRepo) {
                    showToast({
                      style: Toast.Style.Success,
                      title: "Refreshed",
                      message: "Repository details updated",
                    });
                  }
                } catch (error) {
                  showFailureToast(error, { title: "Failed to refresh repository" });
                } finally {
                  setIsLoading(false);
                }
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

// Import the EditRepositoryForm component
import { EditRepositoryForm } from "./edit-repository-form";

export default RepositoryDetails;
