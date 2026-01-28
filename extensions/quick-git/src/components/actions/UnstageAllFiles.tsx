import { Action, Icon, Keyboard, showToast } from "@raycast/api";
import { showFailureToast, useExec } from "@raycast/utils";
import { useRepo } from "../../hooks/useRepo.js";
import { useCheckStatus } from "../../hooks/useCheckStatus.js";

export function UnstageAllFiles() {
  const repo = useRepo();
  const checkStatus = useCheckStatus();
  const { revalidate } = useExec("git", ["restore", "--staged", "."], {
    cwd: repo,
    execute: false,
    onData: () => {
      checkStatus();
      showToast({ title: "Unstaged files" });
    },
    onError: (error) => {
      showFailureToast(error, { title: "Could not unstage files" });
    },
  });

  return (
    <Action
      title="Unstage All Files"
      icon={Icon.MinusCircle}
      onAction={revalidate}
      shortcut={Keyboard.Shortcut.Common.RemoveAll}
    />
  );
}
