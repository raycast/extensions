import { useState } from "react";
import { Icon, Image, List } from "@raycast/api";
import type { StatusInfo } from "../../utils/git-status/porcelain.js";
import type { BranchInfo } from "../../utils/git-status/branch.js";
import { GitStatusItemDetail } from "./GitStatusItemDetail.js";
import { GitStatusItemActions } from "./GitStatusItemActions.js";

interface Props {
  branch: BranchInfo;
  status: StatusInfo;
}

export function GitStatusItem({ status, branch }: Props) {
  const [diff, setDiff] = useState("");

  return (
    <List.Item
      icon={statusIcon(status)}
      title={status.origPath ? `${status.origPath} -> ${status.fileName}` : status.fileName}
      actions={
        <GitStatusItemActions
          isNotStaged={status.changes.hasUnstagedChanges}
          isCommittedFile={status.changes.isTracked}
          isShowingDiff={!!diff}
          isSubmodule={status.submodule.isSubmodule}
          fileName={status.fileName}
          updateDiff={setDiff}
        />
      }
      detail={<GitStatusItemDetail branch={branch} status={status} diff={diff} />}
    />
  );
}

function statusIcon(status: StatusInfo): Image.ImageLike {
  if (status.changes.hasStagedChanges && status.changes.hasUnstagedChanges) {
    return Icon.CircleProgress50;
  }

  if (status.changes.hasStagedChanges && !status.changes.hasUnstagedChanges) {
    return Icon.CheckCircle;
  }

  return Icon.Circle;
}
