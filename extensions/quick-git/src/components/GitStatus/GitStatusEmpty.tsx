import { useMemo } from "react";
import { List } from "@raycast/api";
import type { BranchInfo } from "../../utils/branch.js";
import { useRepo } from "../../hooks/useRepo.js";

interface Props {
  branch?: BranchInfo;
}

export function GitStatusEmpty({ branch }: Props) {
  const { value } = useRepo();

  const title = useMemo(() => {
    if (value && branch) {
      return `On branch ${branch.name}`;
    }

    return "Please select a repo";
  }, [branch, value]);

  const description = useMemo(() => {
    if (!value || !branch) {
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
  }, [branch, value]);

  return <List.EmptyView title={title} description={description} />;
}
