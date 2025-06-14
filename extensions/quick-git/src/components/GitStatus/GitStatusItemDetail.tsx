import { List } from "@raycast/api";
import type { BranchInfo } from "../../utils/branch.js";
import type { StatusInfo } from "../../utils/status.js";
import { GitStatusTags } from "./GitStatusTags.js";

interface Props {
  branch: BranchInfo;
  status: StatusInfo;
}

export function GitStatusItemDetail({ branch, status }: Props) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="File path" text={status.fileName} />
          {status.origPath ? <List.Item.Detail.Metadata.Label title="Original path" text={status.origPath} /> : null}
          <GitStatusTags stagedStatus={status.staged} unstagedStatus={status.unstaged} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Branch" text={branch.name} />
          {branch.upstream ? (
            <>
              <List.Item.Detail.Metadata.Label title="Upstream" text={branch.upstream} />
              <List.Item.Detail.Metadata.Label title="Ahead" text={`${branch.ahead} commits`} />
              <List.Item.Detail.Metadata.Label title="Behind" text={`${branch.behind} commits`} />
            </>
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
