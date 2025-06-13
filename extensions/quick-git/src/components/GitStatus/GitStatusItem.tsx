import { useMemo, useState } from "react";
import { Icon, List } from "@raycast/api";
import type { StatusInfo } from "../../utils/status.js";
import type { BranchInfo } from "../../utils/branch.js";
import { GitStatusItemDetail } from "./GitStatusItemDetail.js";
import { GitStatusItemActions } from "./GitStatusItemActions.js";

interface Props {
  branch: BranchInfo;
  status: StatusInfo;
  checkStatus: () => void;
}

export function GitStatusItem({ status, branch, checkStatus }: Props) {
  const [diff, setDiff] = useState("");
  const isNotStaged = useMemo(() => {
    return status.staged === "." || status.staged === "?";
  }, [status.staged]);

  const isCommittedFile = useMemo(() => {
    return status.format !== "untracked" && status.format !== "ignored";
  }, [status.format]);

  const title = useMemo(() => {
    if (status.origPath) {
      return `${status.origPath} -> ${status.fileName}`;
    }
    return status.fileName;
  }, [status.fileName, status.origPath]);

  return (
    <List.Item
      icon={isNotStaged ? Icon.Circle : Icon.CheckCircle}
      title={title}
      actions={
        <GitStatusItemActions
          isNotStaged={isNotStaged}
          isCommittedFile={isCommittedFile}
          isShowingDiff={!!diff}
          fileName={status.fileName}
          checkStatus={checkStatus}
          updateDiff={setDiff}
        />
      }
      detail={<GitStatusItemDetail branch={branch} status={status} diff={diff} />}
    />
  );
}
