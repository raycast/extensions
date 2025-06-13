import { List } from "@raycast/api";
import { BranchInfo } from "../../utils/branch.js";
import { useMemo } from "react";

interface Props {
  repo?: string;
  branch?: BranchInfo;
}

export function GitStatusEmpty({ branch, repo }: Props) {
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
