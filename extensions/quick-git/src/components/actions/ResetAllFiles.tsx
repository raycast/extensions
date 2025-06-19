import { Action, Icon, showToast } from "@raycast/api";
import { showFailureToast, useExec } from "@raycast/utils";
import { useRepo } from "../../hooks/useRepo.js";
import { useCheckStatus } from "../../hooks/useCheckStatus.js";

export function ResetAllUnstagedFiles() {
  const repo = useRepo();
  const checkStatus = useCheckStatus();
  const { revalidate } = useExec("git", ["restore", "."], {
    cwd: repo,
    execute: false,
    onData: () => {
      checkStatus();
      showToast({ title: `Reset all unstaged files to their previous state` });
    },
    onError: (error) => {
      showFailureToast(error, { title: `Could not reset unstaged files` });
    },
  });

  return (
    <Action title="Reset All Unstaged Files" icon={Icon.Undo} onAction={revalidate} style={Action.Style.Destructive} />
  );
}
