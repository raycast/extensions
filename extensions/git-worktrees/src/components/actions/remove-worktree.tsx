import { UNTRACKED_OR_MODIFIED_FILES_ERROR } from "#/config/constants";
import { Worktree } from "#/config/types";
import { removeWorktreeFromCache } from "#/helpers/cache";
import { pruneWorktrees, removeBranch, removeWorktree } from "#/helpers/git";
import { Action, confirmAlert, Icon, showToast, Toast } from "@raycast/api";
import path from "node:path";

export const RemoveWorktree = ({
  worktree,
  revalidateProjects,
}: {
  worktree: Worktree;
  revalidateProjects: () => void;
}) => {
  const handleRemoveWorktree = async (worktree: Worktree) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Removing Worktree",
      message: "Please wait while the worktree is being removed",
    });

    const worktreeName = path.basename(worktree.path);
    const projectPath = path.dirname(worktree.path);
    const projectName = path.basename(projectPath);

    try {
      await removeWorktree({ parentPath: projectPath, worktreeName });
    } catch (e) {
      if (!(e instanceof Error)) throw e;

      const errorMessage = e.message;

      if (!errorMessage.includes(UNTRACKED_OR_MODIFIED_FILES_ERROR)) throw e;

      const confirmed = await confirmAlert({
        title: "Worktree has unsaved changes",
        message: "This action cannot be undone, are you sure?",
      });

      if (!confirmed) {
        toast.style = Toast.Style.Failure;
        toast.title = "Aborted Removal";
        toast.message = "The worktree was not removed";
        return;
      }

      await removeWorktree({ parentPath: projectPath, worktreeName, force: true });
    }

    toast.title = "Running Cleanup";
    toast.message = "Cleaning up worktrees and branches";
    if (worktree.branch) await removeBranch({ path: projectPath, branch: worktree.branch });
    await pruneWorktrees({ path: projectPath });

    toast.style = Toast.Style.Success;
    toast.title = "Worktree Removed";
    toast.message = "The worktree has been removed";

    removeWorktreeFromCache({ projectName, worktreeId: worktree.id, onSuccess: revalidateProjects });
  };

  return (
    <Action
      title="Remove Worktree"
      icon={Icon.Trash}
      shortcut={{ key: "d", modifiers: ["cmd"] }}
      style={Action.Style.Destructive}
      onAction={() => handleRemoveWorktree(worktree)}
    />
  );
};
