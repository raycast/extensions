import { List, ActionPanel, Action, showToast, Toast, confirmAlert, Alert, Icon, trash } from "@raycast/api";
import { execFile } from "child_process";
import { useCachedPromise } from "@raycast/utils";
import { GitRepo, GitRepoService, GitRepoType, tildifyPath } from "./utils";

function updateToast(toast: Toast, style: Toast.Style, title: string, message?: string) {
  toast.style = style;
  toast.title = title;
  toast.message = message;
}

function git(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("git", args, { cwd }, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout);
    });
  });
}

async function deleteFromDisk(repo: GitRepo, revalidate: () => void) {
  const removeToast = await showToast({ style: Toast.Style.Animated, title: "Removing repository…" });
  try {
    await trash(repo.fullPath);
    updateToast(removeToast, Toast.Style.Success, "Repository removed");
    revalidate();
  } catch (err) {
    updateToast(
      removeToast,
      Toast.Style.Failure,
      "Failed to remove repository",
      err instanceof Error ? err.message : String(err),
    );
  }
}

async function removeRepo(repo: GitRepo, revalidate: () => void) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Checking repository…" });

  try {
    const statusOutput = await git(["status", "--porcelain"], repo.fullPath);
    if (statusOutput.trim().length > 0) {
      updateToast(
        toast,
        Toast.Style.Failure,
        "Cannot remove repository",
        "There are uncommitted changes or untracked files",
      );
      return;
    }

    const remotesOutput = await git(["remote"], repo.fullPath);
    if (remotesOutput.trim().length > 0) {
      const localCommitsOutput = await git(["log", "--oneline", "--branches", "--not", "--remotes"], repo.fullPath);
      if (localCommitsOutput.trim().length > 0) {
        updateToast(
          toast,
          Toast.Style.Failure,
          "Cannot remove repository",
          "There are local commits that haven't been pushed",
        );
        return;
      }
    }

    await toast.hide();
  } catch (err) {
    updateToast(
      toast,
      Toast.Style.Failure,
      "Failed to check repository",
      err instanceof Error ? err.message : String(err),
    );
    return;
  }

  const confirmed = await confirmAlert({
    title: `Remove "${repo.name}"?`,
    message: "This will move the repository to the Trash.",
    primaryAction: {
      title: "Remove",
      style: Alert.ActionStyle.Destructive,
    },
  });

  if (!confirmed) return;

  await deleteFromDisk(repo, revalidate);
}

async function forceRemoveRepo(repo: GitRepo, revalidate: () => void) {
  const confirmed = await confirmAlert({
    title: `Force remove "${repo.name}"?`,
    message: "This will move the repository to the Trash, including any uncommitted changes or unpushed commits.",
    primaryAction: {
      title: "Force Remove",
      style: Alert.ActionStyle.Destructive,
    },
  });

  if (!confirmed) return;

  await deleteFromDisk(repo, revalidate);
}

export default function RemoveRepo() {
  const { data: repos, isLoading, revalidate } = useCachedPromise(GitRepoService.gitRepos);
  const removableRepos = repos?.filter(
    (repo) => repo.repoType !== GitRepoType.Worktree && repo.repoType !== GitRepoType.Submodule,
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search repositories...">
      <List.EmptyView
        title="No Repositories Found"
        description="Make sure the scan path is configured in preferences."
      />
      {removableRepos?.map((repo) => (
        <List.Item
          key={repo.fullPath}
          title={repo.name}
          icon={repo.icon}
          accessories={[{ text: tildifyPath(repo.fullPath) }]}
          actions={
            <ActionPanel>
              <Action
                title="Remove Repository"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => removeRepo(repo, revalidate)}
              />
              <Action
                title="Force Remove Repository"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                onAction={() => forceRemoveRepo(repo, revalidate)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
