import { Action, Icon } from "@raycast/api";
import { showFailureToast, useExec } from "@raycast/utils";
import { useRepo } from "../../hooks/useRepo.js";
import { useCallback, useMemo } from "react";

interface Props {
  fileName: string;
  isShowingDiff: boolean;
  updateDiff: (data: string) => void;
}

export function FileDiff({ fileName, isShowingDiff, updateDiff }: Props) {
  const { value } = useRepo();
  const { revalidate } = useExec("git", ["diff", "--histogram", "head", fileName], {
    cwd: value,
    execute: false,
    keepPreviousData: false,
    onData: (data) => {
      updateDiff(data);
    },
    onError: (error) => {
      showFailureToast(error, {
        title: `Could not generate diff for ${fileName}`,
      });
    },
  });

  const title = useMemo(() => (isShowingDiff ? "Show Diff" : "Hide Diff"), [isShowingDiff]);

  const action = useCallback(() => {
    if (isShowingDiff) {
      updateDiff("");
    } else {
      revalidate();
    }
  }, [isShowingDiff, revalidate, updateDiff]);

  return <Action title={title} icon={Icon.CodeBlock} onAction={action} shortcut={{ key: "d", modifiers: ["cmd"] }} />;
}
