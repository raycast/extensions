import { Action, Icon } from "@raycast/api";
import { Workspace } from "../types";
import { EditWorkspaceForm } from ".";

function EditWorkspaceAction(props: { draftValue?: Workspace; onEdit: (workspace: Workspace) => void }) {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Edit Workspace"
      shortcut={{ modifiers: ["cmd"], key: "e" }}
      target={<EditWorkspaceForm draftValue={props.draftValue} onEdit={props.onEdit} />}
    />
  );
}

export default EditWorkspaceAction;
