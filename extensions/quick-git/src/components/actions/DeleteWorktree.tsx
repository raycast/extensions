import { Action, Icon, showToast } from "@raycast/api";
import { showFailureToast, useExec } from "@raycast/utils";
import { useRepo } from "../../hooks/useRepo.js";

interface Props {
  worktreePath: string;
  worktreeName: string;
  checkBranches: () => void;
}

export function DeleteWorktree({ worktreeName, worktreePath, checkBranches }: Props) {
  const repo = useRepo();
  const { revalidate: hardDeleteWorktree } = useExec("git", ["worktree", "remove", "--force", worktreePath], {
    cwd: repo,
    execute: false,
    onData: () => {
      showToast({ title: `Deleted worktree ${worktreeName}` });
      checkBranches();
    },
    onError: (error) => {
      showFailureToast(error, { title: `Could not delete worktree ${worktreeName}` });
    },
  });
  const { revalidate: deleteWorktree } = useExec("git", ["worktree", "remove", worktreePath], {
    cwd: repo,
    execute: false,
    onData: () => {
      showToast({ title: `Deleted worktree ${worktreeName}` });
      checkBranches();
    },
    onError: (error) => {
      showFailureToast(error, {
        title: `Could not delete ${worktreeName}`,
        primaryAction: {
          title: "Force Delete Worktree?",
          onAction: hardDeleteWorktree,
        },
      });
    },
  });

  return (
    <Action
      title="Delete This Worktree"
      icon={Icon.Trash}
      shortcut={{ macOS: { key: "backspace", modifiers: ["cmd"] }, Windows: { key: "backspace", modifiers: ["ctrl"] } }}
      onAction={deleteWorktree}
      style={Action.Style.Destructive}
    />
  );
}
