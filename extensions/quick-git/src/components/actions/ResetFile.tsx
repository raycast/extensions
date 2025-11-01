import { Action, Icon, Keyboard, showToast } from "@raycast/api";
import { showFailureToast, useExec } from "@raycast/utils";
import { useRepo } from "../../hooks/useRepo.js";
import { useCheckStatus } from "../../hooks/useCheckStatus.js";

interface Props {
  fileName: string;
}

export function ResetFile({ fileName }: Props) {
  const repo = useRepo();
  const checkStatus = useCheckStatus();
  const { revalidate } = useExec("git", ["restore", fileName], {
    cwd: repo,
    execute: false,
    onData: () => {
      checkStatus();
      showToast({ title: `Reset ${fileName} to its previous state` });
    },
    onError: (error) => {
      showFailureToast(error, { title: `Could not reset ${fileName}` });
    },
  });

  return (
    <Action
      title="Reset File"
      icon={Icon.Undo}
      onAction={revalidate}
      shortcut={Keyboard.Shortcut.Common.Remove}
      style={Action.Style.Destructive}
    />
  );
}
