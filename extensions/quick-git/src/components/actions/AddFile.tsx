import { Action, Icon, showToast } from "@raycast/api";
import { showFailureToast, useExec } from "@raycast/utils";
import { useRepo } from "../../hooks/useRepo.js";
import { useCheckStatus } from "../../hooks/useCheckStatus.js";

interface Props {
  fileName: string;
}

export function AddFile({ fileName }: Props) {
  const repo = useRepo();
  const checkStatus = useCheckStatus();
  const { revalidate } = useExec("git", ["add", fileName], {
    cwd: repo,
    execute: false,
    onData: () => {
      checkStatus();
      showToast({ title: `Added ${fileName}` });
    },
    onError: (error) => {
      showFailureToast(error, { title: `Could not stage ${fileName}` });
    },
  });

  return <Action title="Add" icon={Icon.Plus} onAction={revalidate} />;
}
