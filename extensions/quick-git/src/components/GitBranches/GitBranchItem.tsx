import { useMemo } from "react";
import { Color, List } from "@raycast/api";
import { GitBranchItemActions } from "./GitBranchItemActions.js";
import { BranchInfo } from "../../utils/git-branch/branch.js";

interface Props {
  branch: BranchInfo;
  checkBranches: () => void;
  updateRepo: (value: string) => Promise<void>;
}

export function GitBranchItem({ branch, checkBranches, updateRepo }: Props) {
  const accessories = useMemo(() => {
    if (branch.isCurrentBranch) {
      return [{ tag: { value: "Current branch", color: Color.PrimaryText } }];
    }

    if (branch.isWorktree) {
      return [{ tag: { value: "Worktree" } }];
    }
  }, [branch.isCurrentBranch, branch.isWorktree]);

  return (
    <List.Item
      title={branch.name}
      accessories={accessories}
      actions={
        <GitBranchItemActions
          branch={branch.name}
          isCurrentBranch={branch.isCurrentBranch}
          isWorktree={branch.isWorktree}
          checkBranches={checkBranches}
          updateRepo={updateRepo}
        />
      }
    />
  );
}
