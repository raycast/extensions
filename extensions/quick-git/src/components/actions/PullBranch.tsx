import { Action, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { showFailureToast, useExec } from "@raycast/utils";
import { useRepo } from "../../hooks/useRepo.js";

interface Props {
  checkStatus: () => void;
}

export function PullBranch({ checkStatus }: Props) {
  const { value } = useRepo();
  const { revalidate } = useExec("git", ["pull"], {
    cwd: value,
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
