import { Action, Icon } from "@raycast/api";

function DeleteWorkspaceAction(props: { onDelete: () => void }) {
  return <Action icon={Icon.Trash} title="Delete Workspace" onAction={props.onDelete} />;
}

export default DeleteWorkspaceAction;
