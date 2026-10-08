import { LocalStorage } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect } from "react";

import { BranchDetailsFragment } from "../generated/graphql";

const VISITED_BRANCH_KEY = "VISITED_BRANCHES";
const VISITED_BRANCH_LENGTH = 10;

// History was stored in `LocalStorage` before, after migration it's stored in `Cache`
type BranchCacheFragment = { branch: BranchDetailsFragment; repository: string };

async function loadVisitedBranches() {
  const item = await LocalStorage.getItem<string>(VISITED_BRANCH_KEY);
  if (item) {
    const parsed = JSON.parse(item).slice(0, VISITED_BRANCH_LENGTH);
    return parsed as BranchCacheFragment[];
  } else {
    return [];
  }
}

export function useBranchHistory() {
  const [history, setHistory] = useCachedState<BranchCacheFragment[]>("BranchHistory", []);
  const [migratedHistory, setMigratedHistory] = useCachedState<boolean>("migratedBranchHistory", false);

  useEffect(() => {
    if (!migratedHistory) {
      loadVisitedBranches().then((branches) => {
        setHistory(branches);
        setMigratedHistory(true);
      });
    }
  }, [migratedHistory]);

  function visitBranch(branch: BranchDetailsFragment, repository: string) {
    const visitedBranches: BranchCacheFragment[] = [
      { branch: branch, repository: repository },
      ...(history?.filter((item) => {
        return `${item.branch.branchName}-${item.repository}` !== `${branch.branchName}-${repository}`;
      }) ?? []),
    ];
    LocalStorage.setItem(VISITED_BRANCH_KEY, JSON.stringify(visitedBranches));
    const nextBranch = visitedBranches.slice(0, VISITED_BRANCH_LENGTH);
    setHistory(nextBranch);
  }

  function removeBranch(branch: BranchDetailsFragment, repository: string) {
    const visitedBranches: BranchCacheFragment[] = [
      ...(history?.filter((item) => {
        return `${item.branch.branchName}-${item.repository}` !== `${branch.branchName}-${repository}`;
      }) ?? []),
    ];
    LocalStorage.setItem(VISITED_BRANCH_KEY, JSON.stringify(visitedBranches));
    const nextBranch = visitedBranches.slice(0, VISITED_BRANCH_LENGTH);
    setHistory(nextBranch);
  }

  return { history, visitBranch, removeBranch };
}
