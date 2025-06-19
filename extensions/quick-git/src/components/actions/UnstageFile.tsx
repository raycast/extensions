import { Action, Icon, showToast } from "@raycast/api";
import { showFailureToast, useExec } from "@raycast/utils";
import { useRepo } from "../../hooks/useRepo.js";
import { useCheckStatus } from "../../hooks/useCheckStatus.js";

interface Props {
  fileName: string;
}

export function UnstageFile({ fileName }: Props) {
  const repo = useRepo();
  const checkStatus = useCheckStatus();
  const { revalidate } = useExec("git", ["restore", "--staged", fileName], {
    cwd: repo,
    execute: false,
    onData: () => {
      checkStatus();
      showToast({ title: `Unstaged ${fileName}` });
    },
    onError: (error) => {
      showFailureToast(error, { title: `Could not unstage ${fileName}` });
    },
  });

  return <Action title="Unstage" icon={Icon.Minus} onAction={revalidate} />;
}
