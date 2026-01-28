import {
  List,
  Action,
  ActionPanel,
  Icon,
  openExtensionPreferences,
  Image,
  Color,
  showToast,
  Toast,
  open,
} from "@raycast/api";
import { homedir } from "os";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import type { RepositoryListItemProps } from "../types";

const execAsync = promisify(exec);

export default function RepositoryListItem({
  repo,
  isBookmarked,
  onToggleBookmark,
  cloneDirectory,
}: RepositoryListItemProps) {
  const handleClone = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Cloning repository...",
    });

    try {
      // Use user's preference or default to ~/Developer
      const baseDir = cloneDirectory || "~/Developer";
      const cloneDir = baseDir.startsWith("~")
        ? join(homedir(), baseDir.slice(2))
        : baseDir;
      const repoPath = join(cloneDir, repo.name);

      // Clone the repository
      await execAsync(`git clone ${repo.clone_url} "${repoPath}"`);

      toast.style = Toast.Style.Success;
      toast.title = "Repository cloned successfully";
      toast.message = `Cloned to ${repoPath}`;
      toast.primaryAction = {
        title: "Open in Finder",
        onAction: () => open(repoPath),
      };
      toast.secondaryAction = {
        title: "Open in Terminal",
        onAction: () => open(repoPath, "Terminal"),
      };
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to clone repository";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  };
  return (
    <List.Item
      key={repo.id}
      title={repo.name}
      subtitle={repo.description || repo.full_name}
      icon={{
        source: repo.owner.avatar_url,
        mask: Image.Mask.RoundedRectangle,
        tooltip: `@${repo.owner.login}`,
      }}
      accessories={
        [
          isBookmarked && {
            icon: { source: Icon.Star, tintColor: Color.Yellow },
            tooltip: "Bookmarked",
          },
          repo.language && { text: repo.language, tooltip: "Language" },
          {
            icon: Icon.Calendar,
            tooltip: `Last Updated: ${new Date(repo.updated_at).toLocaleString()}`,
          },
          {
            text: `${repo.stargazers_count}`,
            tooltip: "Stars",
            icon: Icon.Star,
          },
          repo.private
            ? {
                icon: { source: Icon.Lock, tintColor: Color.Blue },
                tooltip: "Private Repository",
              }
            : {
                icon: { source: Icon.LockUnlocked, tintColor: Color.Green },
                tooltip: "Public Repository",
              },
        ].filter(Boolean) as List.Item.Accessory[]
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={repo.html_url} title="Open in Browser" />
            <Action
              title="Clone Repository"
              icon={Icon.Download}
              onAction={handleClone}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
            <Action.CopyToClipboard content={repo.html_url} title="Copy URL" />
            <Action.CopyToClipboard
              content={repo.clone_url}
              title="Copy Clone URL"
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action
              title={isBookmarked ? "Remove Bookmark" : "Add Bookmark"}
              icon={isBookmarked ? Icon.StarDisabled : Icon.Star}
              onAction={() => onToggleBookmark(repo.id)}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Open Preferences"
              onAction={openExtensionPreferences}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
