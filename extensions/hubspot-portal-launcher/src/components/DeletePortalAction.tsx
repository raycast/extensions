import { Action, Icon } from "@raycast/api";

function DeletePortalAction(props: { onDelete: () => void }) {
  return (
    <Action
      icon={Icon.Trash}
      title="Delete Portal"
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      onAction={props.onDelete}
    />
  );
}

export default DeletePortalAction;
