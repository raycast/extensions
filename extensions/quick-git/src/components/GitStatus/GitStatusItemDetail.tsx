import { Color, List } from "@raycast/api";
import type { BranchInfo } from "../../utils/git-status/branch.js";
import type { StatusInfo } from "../../utils/git-status/porcelain.js";
import { GitStatusTags } from "./GitStatusTags.js";
import { useMemo } from "react";
import { getProgressIcon } from "@raycast/utils";

interface Props {
  branch: BranchInfo;
  status: StatusInfo;
  diff: string;
}

export function GitStatusItemDetail({ branch, status, diff }: Props) {
  const upstreamData = useMemo(() => {
    if (!branch.upstream) {
      return null;
    }

    return (
      <>
        <List.Item.Detail.Metadata.Label title="Upstream" text={branch.upstream} />
        <List.Item.Detail.Metadata.Label title="Ahead" text={`${branch.ahead} commits`} />
        <List.Item.Detail.Metadata.Label title="Behind" text={`${branch.behind} commits`} />
      </>
    );
  }, [branch.ahead, branch.behind, branch.upstream]);

  const renamedFile = useMemo(() => {
    if (!status.changes.changeScore && !status.origPath) {
      return null;
    }

    const progressIcon = getProgressIcon(status.changes.changeScore ?? 0 / 100, Color.Magenta);
    return (
      <>
        <List.Item.Detail.Metadata.Label title="Original path" text={status.origPath} />
        <List.Item.Detail.Metadata.Label
          title="Similarity to original file"
          text={status.changes.changeScore + "%"}
          icon={progressIcon}
        />
      </>
    );
  }, [status.changes.changeScore, status.origPath]);

  const diffMarkdown = useMemo(() => {
    if (!diff) {
      return null;
    }

    return "```diff\n" + diff;
  }, [diff]);

  return (
    <List.Item.Detail
      markdown={diffMarkdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="File path" text={status.fileName} />
          {renamedFile}
          <GitStatusTags changes={status.changes} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Branch" text={branch.name} />
          {upstreamData}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
