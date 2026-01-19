import { Action, Icon } from "@raycast/api";
import { GitBranches } from "../GitBranches.js";
import { useCheckStatus } from "../../hooks/useCheckStatus.js";

export function ChangeCurrentBranch() {
  const checkStatus = useCheckStatus();
  return (
    <Action.Push
      title="Change Current Branch"
      icon={Icon.Switch}
      target={<GitBranches checkStatus={checkStatus} />}
      shortcut={{ key: "b", modifiers: ["cmd"] }}
    />
  );
}
