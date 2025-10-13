import { Action, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { showFailureToast, useExec } from "@raycast/utils";
import { useRepo } from "../../hooks/useRepo.js";
import { useCheckStatus } from "../../hooks/useCheckStatus.js";

export function PullBranch() {
  const repo = useRepo();
  const checkStatus = useCheckStatus();
  const { revalidate } = useExec("git", ["pull"], {
    cwd: repo,
    execute: false,
    onWillExecute: () => {
      showToast({ title: "Pulling branch", style: Toast.Style.Animated });
    },
    onData: () => {
      checkStatus();
      showToast({ title: "Branch up to date" });
    },
    onError: (error) => {
      showFailureToast(error, { title: "Could not pull this branch" });
    },
  });

  return (
    <Action title="Pull" icon={Icon.Download} onAction={revalidate} shortcut={Keyboard.Shortcut.Common.MoveDown} />
  );
}
