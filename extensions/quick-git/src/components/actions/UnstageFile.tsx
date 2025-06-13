import { Action, Icon, showToast } from "@raycast/api";
import { showFailureToast, useExec } from "@raycast/utils";
import { useRepo } from "../../hooks/useRepo.js";

interface Props {
  fileName: string;
  checkStatus: () => void;
}

export function UnstageFile({ fileName, checkStatus }: Props) {
  const { value } = useRepo();
  const { revalidate } = useExec("git", ["restore", "--staged", fileName], {
    cwd: value,
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
