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
  if (!repo) {
    return <List.EmptyView title="Please select a repo" />;
  }

  return <List.EmptyView title={`On branch ${name}`} description={description(ahead, behind, upstream)} />;
}

function description(ahead?: number, behind?: number, upstream?: string): string {
  if (ahead && behind) {
    return `Ahead of '${upstream}' by ${ahead}, and behind by ${behind} commits`;
  }

  if (ahead && !behind) {
    return `Ahead of '${upstream}' by ${ahead} commits.`;
  }

  if (!ahead && behind) {
    return `Behind '${upstream}' by ${behind} commits.`;
  }

  if (upstream) {
    return `Up to date with ${upstream}`;
  }

  return "Nothing to commit, working tree clean";
}
