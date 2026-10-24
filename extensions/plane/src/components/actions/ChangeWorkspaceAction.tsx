import { Action, Icon } from "@raycast/api";
import ChangeWorkspaceForm from "../ChangeWorkspaceForm";

export default function ChangeWorkspaceAction() {
  return (
    <Action.Push
      title="Change Workspace"
      icon={Icon.Switch}
      shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
      target={<ChangeWorkspaceForm />}
    />
  );
}
