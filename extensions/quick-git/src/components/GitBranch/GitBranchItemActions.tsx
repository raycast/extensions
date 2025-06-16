import { Action, Icon, showToast } from "@raycast/api";
import { showFailureToast, useExec } from "@raycast/utils";
import { GitBranchActions } from "./GitBranchActions.js";

interface Props {
  branch: string;
  repo: string;
  isCurrentBranch: boolean;
  checkBranches: () => void;
  checkStatus: () => void;
}

export function GitBranchItemActions({ repo, branch, isCurrentBranch, checkBranches, checkStatus }: Props) {
  const { revalidate: switchBranch } = useExec("git", ["switch", branch], {
    cwd: repo,
    execute: false,
    onData: () => {
      checkBranches();
      checkStatus();
      showToast({ title: `Switched branch to ${branch}` });
    },
    onError: (error) => {
      showFailureToast(error, { title: `Could not switch to ${branch}` });
    },
  });
  const { revalidate: deleteBranch } = useExec("git", ["branch", "-d", branch], {
    cwd: repo,
    execute: false,
    onData: () => {
      showToast({ title: `Deleted branch ${branch}` });
      checkBranches();
      checkStatus();
    },
    onError: (error) => {
      showFailureToast(error, { title: `Could not delete ${branch}` });
    },
  });
  return (
    <>
      {!isCurrentBranch ? (
        <>
          <Action icon={Icon.Repeat} title="Switch to This Branch" onAction={switchBranch} />
          <Action icon={Icon.Trash} title="Delete This Branch" onAction={deleteBranch} />
        </>
      ) : null}
      <GitBranchActions repo={repo} checkBranches={checkBranches} checkStatus={checkStatus} />
    </>
  );
}
