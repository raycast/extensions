import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  getPreferenceValues,
  popToRoot,
  closeMainWindow,
} from "@raycast/api";
import * as fs from "fs";
import * as os from "os";
import { execFile } from "child_process";
import { Repo, scanRepos } from "./utils";

function git(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("git", args, { cwd }, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout);
    });
  });
}

async function removeRepo(repo: Repo) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Checking repository…" });

  try {
    const statusOutput = await git(["status", "--porcelain"], repo.fullPath);
    if (statusOutput.trim().length > 0) {
      toast.style = Toast.Style.Failure;
      toast.title = "Cannot remove repository";
      toast.message = "There are uncommitted changes";
      return;
    }

    const localCommitsOutput = await git(["log", "--oneline", "--branches", "--not", "--remotes"], repo.fullPath);
    if (localCommitsOutput.trim().length > 0) {
      toast.style = Toast.Style.Failure;
      toast.title = "Cannot remove repository";
      toast.message = "There are local commits that haven't been pushed";
      return;
    }

    await toast.hide();
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to check repository";
    toast.message = err instanceof Error ? err.message : String(err);
    return;
  }

  const confirmed = await confirmAlert({
    title: `Remove "${repo.name}"?`,
    message: "This will permanently delete the repository from your filesystem. This action cannot be undone.",
    primaryAction: {
      title: "Remove",
      style: Alert.ActionStyle.Destructive,
    },
  });

  if (!confirmed) return;

  const removeToast = await showToast({ style: Toast.Style.Animated, title: "Removing repository…" });
  try {
    fs.rmSync(repo.fullPath, { recursive: true, force: true });
    removeToast.style = Toast.Style.Success;
    removeToast.title = "Repository removed";
    await popToRoot();
    await closeMainWindow();
  } catch (err) {
    removeToast.style = Toast.Style.Failure;
    removeToast.title = "Failed to remove repository";
    removeToast.message = err instanceof Error ? err.message : String(err);
  }
}

export default function RemoveRepo() {
  const prefs = getPreferenceValues<Preferences.RemoveRepo>();
  const dirs = prefs.projectDirectories.split(",").filter(Boolean);
  const repos = scanRepos(dirs);

  const emptyTitle = dirs.length === 0 ? "No Directories Configured" : "No Repositories Found";
  const emptyDescription =
    dirs.length === 0
      ? "Add at least one directory in the extension preferences."
      : "Make sure the configured directories exist and contain git repositories.";

  return (
    <List searchBarPlaceholder="Search repositories...">
      <List.EmptyView title={emptyTitle} description={emptyDescription} />
      {repos.map((repo) => (
        <List.Item
          key={repo.fullPath}
          title={repo.name}
          accessories={[{ text: repo.fullPath.replace(os.homedir(), "~") }]}
          actions={
            <ActionPanel>
              <Action title="Remove Repository" style={Action.Style.Destructive} onAction={() => removeRepo(repo)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
