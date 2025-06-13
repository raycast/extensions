import { Action, Icon, Keyboard, showToast } from "@raycast/api";
import { showFailureToast, useExec } from "@raycast/utils";
import { useRepo } from "../../hooks/useRepo.js";

interface Props {
  checkStatus: () => void;
}

export function UnstageAllFiles({ checkStatus }: Props) {
  const { value } = useRepo();
  const { revalidate } = useExec("git", ["restore", "--staged", "."], {
    cwd: value,
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
