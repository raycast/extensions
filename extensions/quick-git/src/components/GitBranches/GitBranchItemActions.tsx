import { useMemo } from "react";
import { ActionPanel } from "@raycast/api";
import { SwitchToBranch } from "../actions/SwitchToBranch.js";
import { DeleteBranch } from "../actions/DeleteBranch.js";
import { DeleteWorktree } from "../actions/DeleteWorktree.js";
import { CreateNewBranch } from "../actions/CreateNewBranch.js";
import { SwitchToLastBranch } from "../actions/SwitchToLastBranch.js";
import { SwitchToWorkTree } from "../actions/SwitchToWorktree.js";
import { CreateNewWorkTree } from "../actions/CreateNewWorktree.js";
import { useWorktreeDir } from "../../hooks/useWorktreeDir.js";

interface Props {
  branch: string;
  isCurrentBranch: boolean;
  isWorktree: boolean;
  checkBranches: () => void;
  updateRepo: (value: string) => Promise<void>;
}

export function GitBranchItemActions({ branch, isCurrentBranch, isWorktree, checkBranches, updateRepo }: Props) {
  const { data: worktreeDir } = useWorktreeDir(branch);

  const actions = useMemo(() => {
    if (isWorktree) {
      return (
        <>
          <SwitchToWorkTree worktree={branch} updateRepo={updateRepo} />
          <DeleteWorktree worktreeName={branch} worktreePath={worktreeDir ?? ""} checkBranches={checkBranches} />
        </>
      );
    }

    if (!isCurrentBranch) {
      return (
        <>
          <SwitchToBranch branch={branch} checkBranches={checkBranches} />
          <DeleteBranch branch={branch} checkBranches={checkBranches} />
        </>
      );
    }

    return null;
  }, [branch, checkBranches, isCurrentBranch, isWorktree, updateRepo, worktreeDir]);

  return (
    <ActionPanel>
      {actions}
      <CreateNewBranch checkBranches={checkBranches} />
      <CreateNewWorkTree checkBranches={checkBranches} />
      <SwitchToLastBranch checkBranches={checkBranches} />
    </ActionPanel>
  );
}
