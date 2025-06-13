import { Action, Icon } from "@raycast/api";
import { GitCommit } from "../GitCommit.js";

interface Props {
  checkStatus: () => void;
}
export function CommitMessage({ checkStatus }: Props) {
  return <Action.Push title="Commit Message" icon={Icon.Pencil} target={<GitCommit checkStatus={checkStatus} />} />;
}
