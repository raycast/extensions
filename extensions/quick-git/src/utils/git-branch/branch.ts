export interface BranchInfo {
  name: string;
  isWorktree: boolean;
  isCurrentBranch: boolean;
}

export function parseBranches(branches: string): BranchInfo[] | undefined {
  if (!branches) {
    return;
  }

  return branches.split("\n").reduce<BranchInfo[]>((list, branch) => {
    if (!branch) {
      return list;
    }

    const parts = branch.trim().split(/\s/);
    let item: BranchInfo;
    if (parts.length > 1) {
      item = {
        name: parts[1],
        isCurrentBranch: parts[0] === "*",
        isWorktree: parts[0] === "+",
      };
    } else {
      item = {
        name: parts[0],
        isWorktree: false,
        isCurrentBranch: false,
      };
    }

    list.push(item);

    return list;
  }, []);
}
