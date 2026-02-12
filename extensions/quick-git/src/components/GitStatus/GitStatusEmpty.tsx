import { useMemo } from "react";
import { List } from "@raycast/api";
import { useRepo } from "../../hooks/useRepo.js";

interface Props {
  name?: string;
  ahead?: number;
  behind?: number;
  upstream?: string;
}

export function GitStatusEmpty({ name, ahead, behind, upstream }: Props) {
  const repo = useRepo();

  const title = useMemo(() => {
    if (repo && name) {
      return `On branch ${name}`;
    }

    return "Please select a repo";
  }, [name, repo]);

  const description = useMemo(() => {
    if (!repo) {
      return;
    }

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

    return "Nothing to commit, working tree clean";
  }, [ahead, behind, repo, upstream]);

  return <List.EmptyView title={title} description={description} />;
}
