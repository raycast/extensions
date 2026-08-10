import { Action, Icon } from "@raycast/api";

function DeleteAction(props: { onDelete: () => void }) {
  return (
    <Action
      icon={Icon.Trash}
      title="Delete"
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      onAction={props.onDelete}
      style={Action.Style.Destructive}
    />
  );
}

export default DeleteAction;
