import { Action, Icon, showToast } from "@raycast/api";
import { showFailureToast, useExec } from "@raycast/utils";
import { useRepo } from "../../hooks/useRepo.js";
import { useCheckStatus } from "../../hooks/useCheckStatus.js";

export function StashAllFiles() {
  const repo = useRepo();
  const checkStatus = useCheckStatus();
  const { revalidate } = useExec("git", ["stash"], {
    cwd: repo,
    execute: false,
    onData: () => {
      checkStatus();
      showToast({ title: "Stashed files" });
    },
    onError: (error) => {
      showFailureToast(error, { title: "Could not stash files" });
    },
  });

  return <Action title="Stash All Files" icon={Icon.SaveDocument} onAction={revalidate} />;
}
