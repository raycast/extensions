import { useState, useEffect } from "react";
import { List, showToast, Toast } from "@raycast/api";
import { getRepoPath, getBranches, getCurrentBranchName, getRepoDisplayName } from "../../_lib/git";
import { handleError } from "../../_lib/error-utils";
import { BranchItem } from "./BranchItem";
import { useBranchActions } from "./useBranchActions";
import { ERROR_MESSAGES } from "../../_constants";

export function ListBranches() {
  const [branches, setBranches] = useState<{ name: string; isLocal: boolean }[]>([]);
  const [activeBranch, setActiveBranch] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [repoPath, setRepoPath] = useState<string>("");

  const { handleCheckout, handleCleanupBranches, handleDeleteBranch, handleWritePrDescription } = useBranchActions();

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (error) {
      handleError(error);
    }
  }, [error]);

  async function fetchBranches() {
    try {
      const path = await getRepoPath();
      const displayName = await getRepoDisplayName();
      setRepoPath(displayName);
      const branches = await getBranches(path);
      const currentBranch = await getCurrentBranchName(path);
      setBranches(branches);
      setActiveBranch(cleanBranchName(currentBranch));
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  }

  const handleCheckoutWrapper = async (branchName: string) => {
    try {
      await handleCheckout(branchName);
      await fetchBranches(); // Refresh the branch list after checkout
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Checkout Failed",
        message: error instanceof Error ? error.message : ERROR_MESSAGES.CHECKOUT_BRANCH,
      });
    }
  };

  const handleCleanupBranchesWrapper = async () => {
    try {
      await handleCleanupBranches();
      await fetchBranches(); // Refresh the branch list after cleanup
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cleanup Failed",
        message: error instanceof Error ? error.message : ERROR_MESSAGES.CLEANUP_BRANCHES,
      });
    }
  };

  const handleDeleteBranchWrapper = async (branchName: string) => {
    try {
      await handleDeleteBranch(branchName);
      await fetchBranches(); // Refresh the branch list after deletion
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Delete Failed",
        message: error instanceof Error ? error.message : ERROR_MESSAGES.DELETE_BRANCH,
      });
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search branches...">
      <List.Section title={`Repository: ${repoPath}`}>
        {branches.map((branch) => (
          <BranchItem
            key={branch.name}
            branch={branch}
            isActive={cleanBranchName(branch.name) === activeBranch}
            onCheckout={handleCheckoutWrapper}
            onWritePrDescription={handleWritePrDescription}
            onDeleteBranch={handleDeleteBranchWrapper}
            onCleanupBranches={handleCleanupBranchesWrapper}
          />
        ))}
      </List.Section>
    </List>
  );
}

function cleanBranchName(branchName: string): string {
  return branchName.replace(/^\* /, "");
}
