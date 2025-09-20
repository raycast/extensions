import { Action, Icon, showToast } from "@raycast/api";
import { showFailureToast, useExec } from "@raycast/utils";
import { useRepo } from "../../hooks/useRepo.js";
import { useCheckStatus } from "../../hooks/useCheckStatus.js";

export function AddAllFiles() {
  const repo = useRepo();
  const checkStatus = useCheckStatus();
  const { revalidate } = useExec("git", ["add", "."], {
    cwd: repo,
    execute: false,
    onData: () => {
      checkStatus();
      showToast({ title: "Added files" });
    },
    onError: (error) => {
      showFailureToast(error, { title: "Could not stage files" });
    },
  });

  return (
    <Action
      title="Add All Files"
      icon={Icon.PlusCircle}
      onAction={revalidate}
      shortcut={{ key: "a", modifiers: ["cmd", "shift"] }}
    />
  );
}
