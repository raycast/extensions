import { useMemo } from "react";
import { List } from "@raycast/api";
import type { BranchInfo } from "../../utils/git-status/branch.js";
import { useRepo } from "../../hooks/useRepo.js";

interface Props {
  branch?: BranchInfo;
}

export function GitStatusEmpty({ branch }: Props) {
  const repo = useRepo();

  const title = useMemo(() => {
    if (repo && branch) {
      return `On branch ${branch.name}`;
    }

    return "Please select a repo";
  }, [branch, repo]);

  const description = useMemo(() => {
    if (!repo || !branch) {
      return;
    }

    const { ahead, behind, upstream } = branch;
    if (upstream) {
      if (ahead && behind) {
        return `Ahead of '${upstream}' by ${ahead}, and behind by ${behind} commits`;
      }

      if (ahead && !behind) {
        return `Ahead of '${upstream}' by ${ahead} commits.`;
      }

      if (!ahead && behind) {
        return `Behind '${upstream}' by ${behind} commits.`;
      }

      return `Up to date with ${upstream}`;
    }

    return "Nothing to commit, working tree clean";
  }, [branch, repo]);

  return <List.EmptyView title={title} description={description} />;
}
