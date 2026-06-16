import { memo } from "react";
import { List } from "@raycast/api";
import { GitSubmoduleItemActions } from "./GitSubmoduleItemActions.js";

interface Props {
  dir: string;
  path: string;
  url: string;
  updateRepo: (repoDir: string) => Promise<void>;
}

export const GitSubmoduleItem = memo(function GitSubmoduleItem({ dir, url, path, updateRepo }: Props) {
  return <List.Item title={dir} actions={<GitSubmoduleItemActions url={url} path={path} updateRepo={updateRepo} />} />;
});
