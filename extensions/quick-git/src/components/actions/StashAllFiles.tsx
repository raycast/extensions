import { Action, Icon, showToast } from "@raycast/api";
import { showFailureToast, useExec } from "@raycast/utils";
import { useRepo } from "../../hooks/useRepo.js";

interface Props {
  checkStatus: () => void;
}

export function StashAllFiles({ checkStatus }: Props) {
  const { value } = useRepo();
  const { revalidate } = useExec("git", ["stash"], {
    cwd: value,
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
