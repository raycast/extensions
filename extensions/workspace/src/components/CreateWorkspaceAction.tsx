import { Action, Icon } from "@raycast/api";
import { Workspace } from "../types";
import { CreateWorkspaceForm } from ".";

function CreateWorkspaceAction(props: { draftValue?: Workspace; onCreate: (workspace: Workspace) => void }) {
  return (
    <Action.Push
      icon={Icon.Plus}
      title="Create Workspace"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<CreateWorkspaceForm draftValue={props.draftValue} onCreate={props.onCreate} />}
    />
  );

}

export default CreateWorkspaceAction;
