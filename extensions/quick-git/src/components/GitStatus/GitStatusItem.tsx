import { useMemo, useState } from "react";
import { Icon, List } from "@raycast/api";
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

  const title = useMemo(() => {
    if (status.origPath) {
      return `${status.origPath} -> ${status.fileName}`;
    }
    return status.fileName;
  }, [status.fileName, status.origPath]);

  const icon = useMemo(() => {
    if (status.changes.hasStagedChanges && status.changes.hasUnstagedChanges) {
      return Icon.CircleProgress50;
    }

    if (status.changes.hasStagedChanges && !status.changes.hasUnstagedChanges) {
      return Icon.CheckCircle;
    }

    return Icon.Circle;
  }, [status.changes.hasStagedChanges, status.changes.hasUnstagedChanges]);

  return (
    <List.Item
      icon={icon}
      title={title}
      actions={
        <GitStatusItemActions
          isNotStaged={status.changes.hasUnstagedChanges}
          isCommittedFile={status.changes.isTracked}
          isShowingDiff={!!diff}
          fileName={status.fileName}
          updateDiff={setDiff}
        />
      }
      detail={<GitStatusItemDetail branch={branch} status={status} diff={diff} />}
    />
  );
}
