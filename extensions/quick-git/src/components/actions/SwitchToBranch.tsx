import { Action, Icon, showToast } from "@raycast/api";
import { showFailureToast, useExec } from "@raycast/utils";
import { useRepo } from "../../hooks/useRepo.js";

interface Props {
  branch: string;
  checkBranches: () => void;
}

export function SwitchToBranch({ branch, checkBranches }: Props) {
  const repo = useRepo();
  const { revalidate } = useExec("git", ["switch", branch], {
    cwd: repo,
    execute: false,
    onData: () => {
      checkBranches();
      showToast({ title: `Switched branch to ${branch}` });
    },
    onError: (error) => {
      showFailureToast(error, { title: `Could not switch to ${branch}` });
    },
  });

  return <Action title="Switch to This Branch" icon={Icon.Repeat} onAction={revalidate} />;
}
