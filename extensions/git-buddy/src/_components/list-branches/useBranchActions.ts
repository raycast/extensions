import { showToast, popToRoot, launchCommand, LaunchType } from "@raycast/api";
import { getRepoPath, checkoutBranch, deleteBranch, cleanupBranches } from "../../_lib/git";
import { handleGitError } from "../../_lib/error-utils";
import { SUCCESS_MESSAGES } from "../../_constants";

export function useBranchActions() {
  async function handleCheckout(branchName: string) {
    try {
      const repoPath = await getRepoPath();
      await checkoutBranch(repoPath, branchName);
      await showToast({ title: "Success", message: SUCCESS_MESSAGES.CHECKOUT_BRANCH(branchName) });
      await popToRoot();
    } catch (error) {
      console.error("Checkout error:", error);
      throw handleGitError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async function handleCleanupBranches() {
    try {
      const repoPath = await getRepoPath();
      await cleanupBranches(repoPath);
      await showToast({ title: "Success", message: SUCCESS_MESSAGES.CLEANUP_BRANCHES });
    } catch (error) {
      console.error("Cleanup error:", error);
      throw handleGitError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async function handleDeleteBranch(branchName: string) {
    try {
      const repoPath = await getRepoPath();
      await deleteBranch(repoPath, branchName);
      await showToast({ title: "Success", message: SUCCESS_MESSAGES.DELETE_BRANCH(branchName) });
    } catch (error) {
      console.error("Delete branch error:", error);
      throw handleGitError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async function handleWritePrDescription(branchName: string) {
    await launchCommand({
      name: "write-pr-description",
      type: LaunchType.UserInitiated,
      context: { baseBranch: branchName },
    });
  }

  return {
    handleCheckout,
    handleCleanupBranches,
    handleDeleteBranch,
    handleWritePrDescription,
  };
}
