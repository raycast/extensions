import { Action, Icon } from "@raycast/api";

function DeleteWorkspaceAction(props: { onDelete: () => void }) {
  return (
    <Action
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      title="Delete Workspace"
      onAction={props.onDelete}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
    />
  );
}

export default DeleteWorkspaceAction;
