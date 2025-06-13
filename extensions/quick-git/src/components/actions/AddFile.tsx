import { Action, Icon, showToast } from "@raycast/api";
import { showFailureToast, useExec } from "@raycast/utils";
import { useRepo } from "../../hooks/useRepo.js";

interface Props {
  fileName: string;
  checkStatus: () => void;
}

export function AddFile({ fileName, checkStatus }: Props) {
  const { value } = useRepo();
  const { revalidate } = useExec("git", ["add", fileName], {
    cwd: value,
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
