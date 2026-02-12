import { Action, Icon, useNavigation } from "@raycast/api";
import { useCallback } from "react";
import { useWorktreeDir } from "../../hooks/useWorktreeDir.js";

interface Props {
  worktree: string;
  updateRepo: (newRepo: string) => Promise<void>;
}

export function SwitchToWorkTree({ worktree, updateRepo }: Props) {
  const { data: worktreeDir } = useWorktreeDir(worktree);
  const { pop } = useNavigation();

  const switchToWorktree = useCallback(() => {
    if (worktreeDir) {
      updateRepo(worktreeDir).then(pop);
    }
  }, [pop, updateRepo, worktreeDir]);

  return <Action title="Switch to This Worktree" icon={Icon.Replace} onAction={switchToWorktree} />;
}
