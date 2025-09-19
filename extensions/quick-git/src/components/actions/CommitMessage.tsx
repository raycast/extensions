import { Action, Icon } from "@raycast/api";
import { GitCommit } from "../forms/GitCommit.js";
import { useCheckStatus } from "../../hooks/useCheckStatus.js";

export function CommitMessage() {
  const checkStatus = useCheckStatus();
  return <Action.Push title="Commit Message" icon={Icon.Pencil} target={<GitCommit checkStatus={checkStatus} />} />;
}
