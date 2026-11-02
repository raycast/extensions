import { shortcut } from "./shortcuts";
import { Keyboard } from "@raycast/api";
import React from "react";
import { Detail, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { withAccessToken, getAccessToken, showFailureToast } from "@raycast/utils";
import Service, { UserRepository, RepositoryCheatsheet } from "./service";
import { githubOAuth } from "./github-oauth";

function RepositoryDetailsComponent({
  repo: initialRepo,
  onUpdated,
}: {
  repo: UserRepository;
  onUpdated?: () => void;
}) {
  const { token } = getAccessToken();
  const [repo, setRepo] = useState(initialRepo);
  const [isLoading, setIsLoading] = useState(false);
  const [cheatsheets, setCheatsheets] = useState<RepositoryCheatsheet[]>([]);

  useEffect(() => {
    // Record access when component mounts
    Service.recordRepositoryAccess(repo.id).catch((error) =>
      showFailureToast(error, { title: "Could Not Save Access History" }),
    );

    // Load cheatsheets for this repository immediately
    loadCheatsheets();
  }, [repo.id]);

  const loadCheatsheets = async () => {
    try {
      const sheets = await Service.getRepositoryCheatsheets(repo.id);
      setCheatsheets(sheets);
      const updated = await Service.getUserRepository(repo.id);
      if (updated) setRepo(updated);
    } catch (error) {
      showFailureToast(error, { title: "Could Not Load Cached Sheets" });
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelativeDate = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(timestamp);
  };

  const handleSync = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await Service.syncRepositoryFiles(repo, token);
      await loadCheatsheets(); // Reload cheatsheets after sync
      if (onUpdated) {
        onUpdated();
      }
    } catch (error) {
      showFailureToast(error, { title: "Failed to sync repository" });
    } finally {
      setIsLoading(false);
    }
  };

  const cheatsheetsMarkdown =
    cheatsheets.length > 0
      ? `## 📚 Synced Cheatsheets (${cheatsheets.length})

${cheatsheets
  .map(
    (sheet) =>
      `- **${sheet.title}**  
    \`${sheet.filePath}\`  
    ${sheet.lastAccessedAt ? `Last viewed: ${formatRelativeDate(sheet.lastAccessedAt)}` : `Synced: ${formatRelativeDate(sheet.syncedAt)}`}`,
  )
  .join("\n\n")}`
      : `## 📚 Synced Cheatsheets

No cheatsheets found. Use the **Sync Repository** action to fetch cheatsheet files from this repository.`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={cheatsheetsMarkdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Repository" text={repo.name} />
          <Detail.Metadata.Label title="Owner" text={repo.owner} icon={Icon.Person} />
          {repo.description && <Detail.Metadata.Label title="Description" text={repo.description} />}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="URL" target={repo.url} text={repo.url} />
          <Detail.Metadata.Label title="Default Branch" text={repo.defaultBranch} />
          <Detail.Metadata.Label
            title="Visibility"
            text={repo.isPrivate ? "Private" : "Public"}
            icon={repo.isPrivate ? Icon.Lock : Icon.Globe}
          />
          {repo.subdirectory && <Detail.Metadata.Label title="Subdirectory" text={repo.subdirectory} />}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Added" text={formatDate(repo.addedAt)} />
          {repo.lastAccessedAt && (
            <Detail.Metadata.Label title="Last Accessed" text={formatRelativeDate(repo.lastAccessedAt)} />
          )}
          <Detail.Metadata.Label
            title="Last Synced"
            text={repo.lastSyncedAt ? formatRelativeDate(repo.lastSyncedAt) : "Never"}
            icon={repo.lastSyncedAt ? Icon.CheckCircle : Icon.ExclamationMark}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Cheatsheets" text={`${cheatsheets.length} found`} icon={Icon.Document} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Repository Actions">
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
            <Action.CopyToClipboard
              title="Copy Clone URL"
              content={`git clone ${repo.url}.git`}
              icon={Icon.Terminal}
              shortcut={shortcut("c", true)}
            />
            <Action
              title="Sync Repository"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={handleSync}
            />
          </ActionPanel.Section>
          {cheatsheets.length > 0 && (
            <ActionPanel.Section title="Cheatsheets">
              <Action.CopyToClipboard
                title="Copy Cheatsheet List"
                icon={Icon.CopyClipboard}
                shortcut={shortcut("l", true)}
                content={cheatsheets.map((sheet) => `- ${sheet.title} (${sheet.filePath})`).join("\n")}
                onCopy={() => {
                  showToast({
                    style: Toast.Style.Success,
                    title: "Copied",
                    message: "Cheatsheet list copied to clipboard",
                  });
                }}
              />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section title="Manage">
            <Action.Push
              title="Edit Repository"
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
              target={
                <EditRepositoryForm
                  repo={repo}
                  onUpdated={() => {
                    void loadCheatsheets();
                    onUpdated?.();
                  }}
                />
              }
            />
            <Action
              title="Refresh Details"
              icon={Icon.ArrowClockwise}
              onAction={async () => {
                setIsLoading(true);
                try {
                  await loadCheatsheets();
                  const updatedRepo = await Service.getUserRepository(repo.id);
                  if (updatedRepo) {
                    setRepo(updatedRepo);
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

// Import the components we need
import { EditRepositoryForm } from "./edit-repository-form";

// Keep the published OAuth entry boundary.
export const RepositoryDetailsWithAuth = withAccessToken(githubOAuth)(RepositoryDetailsComponent);
