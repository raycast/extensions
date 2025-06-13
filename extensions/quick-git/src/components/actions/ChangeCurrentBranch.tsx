import { Action, Icon } from "@raycast/api";
import { GitBranches } from "../GitBranches.js";

interface Props {
  checkStatus: () => void;
}

export function ChangeCurrentBranch({ checkStatus }: Props) {
  return (
    <Action.Push
      title="Change Current Branch"
      icon={Icon.Switch}
      target={<GitBranches checkStatus={checkStatus} />}
      shortcut={{ key: "b", modifiers: ["cmd"] }}
    />
  );
}
