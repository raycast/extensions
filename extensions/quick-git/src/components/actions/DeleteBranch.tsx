import { Action, Icon, showToast } from "@raycast/api";
import { showFailureToast, useExec } from "@raycast/utils";
import { useRepo } from "../../hooks/useRepo.js";

interface Props {
  branch: string;
  checkBranches: () => void;
}

export function DeleteBranch({ branch, checkBranches }: Props) {
  const repo = useRepo();
  const { revalidate: hardDeleteBranch } = useExec("git", ["branch", "-D", branch], {
    cwd: repo,
    execute: false,
    onData: () => {
      showToast({ title: `Deleted branch ${branch}` });
      checkBranches();
    },
    onError: (error) => {
      showFailureToast(error, { title: `Could not delete branch ${branch}` });
    },
  });
  const { revalidate: deleteBranch } = useExec("git", ["branch", "-d", branch], {
    cwd: repo,
    execute: false,
    onData: () => {
      showToast({ title: `Deleted branch ${branch}` });
      checkBranches();
    },
    onError: (error) => {
      showFailureToast(error, {
        title: `Could not delete ${branch}`,
        primaryAction: {
          title: "Force Delete Branch?",
          onAction: hardDeleteBranch,
        },
      });
    },
  });

  return (
    <Action title="Delete This Branch" icon={Icon.Trash} onAction={deleteBranch} style={Action.Style.Destructive} />
  );
}
