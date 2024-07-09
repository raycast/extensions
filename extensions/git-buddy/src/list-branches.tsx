import { useState, useEffect } from "react";
import { Action, ActionPanel, List, showToast, popToRoot, Icon, launchCommand, LaunchType } from "@raycast/api";
import {
  getRepoPath,
  getBranches,
  checkoutBranch,
  getCurrentBranchName,
  deleteBranch,
  cleanupBranches,
} from "./_lib/git-utils";
import { handleError } from "./_lib/error-utils";

export default function Command() {
  const [branches, setBranches] = useState<{ name: string; isLocal: boolean }[]>([]);
  const [activeBranch, setActiveBranch] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (error) {
      const handleAsyncError = async () => {
        await handleError(error);
      };
      handleAsyncError();
    }
  }, [error]);

  async function fetchBranches() {
    try {
      const repoPath = await getRepoPath();
      const branches = await getBranches(repoPath);
      const currentBranch = await getCurrentBranchName(repoPath);
      setBranches(branches);
      setActiveBranch(cleanBranchName(currentBranch));
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError(String(error));
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCheckout(branchName: string) {
    try {
      const repoPath = await getRepoPath();
      await checkoutBranch(repoPath, branchName);
      await showToast({ title: "Success", message: `Checked out to ${branchName}.` });
      await popToRoot();
    } catch (error) {
      setError(`Failed to checkout to ${branchName}.`);
    }
  }

  async function handleCleanupBranches() {
    try {
      const repoPath = await getRepoPath();
      await cleanupBranches(repoPath);
      await showToast({ title: "Success", message: "Cleaned up branches and switched to main." });
      fetchBranches();
    } catch (error) {
      setError("Failed to clean up branches.");
    }
  }

  async function handleDeleteBranch(branchName: string) {
    try {
      const repoPath = await getRepoPath();
      await deleteBranch(repoPath, branchName);
      await showToast({ title: "Success", message: `Deleted branch ${branchName}.` });
      fetchBranches();
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError(`Failed to delete branch ${branchName}.`);
      }
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search branches...">
      {branches.map((branch) => {
        const cleanedBranch = cleanBranchName(branch.name);
        const accessories = [];

        // Indicate the active branch
        if (cleanedBranch === activeBranch) {
          accessories.push({ text: "🟢 Active Branch" });
        }

        // Indicate untracked local branches
        if (branch.isLocal) {
          accessories.push({ text: "⚠︎ Untracked" });
        }

        return (
          <List.Item
            key={cleanedBranch}
            title={cleanedBranch}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action
                  title="Checkout Branch"
                  onAction={() => handleCheckout(cleanedBranch)}
                  icon={Icon.ArrowRightCircle}
                />
                <Action
                  title="Write PR Description → This Branch"
                  onAction={() => handleWritePrDescription(cleanedBranch)}
                  icon={Icon.Pencil}
                />
                <Action.CopyToClipboard
                  title="Copy Branch Name"
                  content={cleanedBranch}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  icon={Icon.CopyClipboard}
                />
                <Action
                  title="Delete Branch"
                  onAction={() => handleDeleteBranch(cleanedBranch)}
                  icon={Icon.Trash}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                />
                <Action
                  title="Clean Up Branches"
                  onAction={handleCleanupBranches}
                  icon={Icon.Eraser}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

// Remove leading "* " from branch names
function cleanBranchName(branchName: string): string {
  return branchName.replace(/^\* /, "");
}

// Launch command to write a PR description for the given branch
async function handleWritePrDescription(branchName: string) {
  await launchCommand({
    name: "write-pr-description",
    type: LaunchType.UserInitiated,
    context: { targetBranch: branchName },
  });
}
