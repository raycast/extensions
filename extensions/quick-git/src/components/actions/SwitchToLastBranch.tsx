import { Action, Icon, showToast } from "@raycast/api";
import { showFailureToast, useExec } from "@raycast/utils";
import { useRepo } from "../../hooks/useRepo.js";

interface Props {
  checkBranches: () => void;
}

export function SwitchToLastBranch({ checkBranches }: Props) {
  const repo = useRepo();
  const { revalidate } = useExec("git", ["switch", "-"], {
    cwd: repo,
    execute: false,
    onData: () => {
      checkBranches();
      showToast({ title: "Changed branch" });
    },
    onError: (error) => {
      showFailureToast(error, { title: "Could not switch branches" });
    },
  });

  return (
    <Action
      title="Switch to Your Last Branch"
      icon={Icon.Replace}
      onAction={revalidate}
      shortcut={{ key: "-", modifiers: ["cmd"] }}
    />
  );
}
