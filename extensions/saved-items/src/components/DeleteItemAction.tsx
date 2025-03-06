import { Action, Icon, Alert, confirmAlert } from "@raycast/api";

function DeleteItemAction(props: { onDelete: () => void }) {
  return (
    <Action
      icon={Icon.Trash}
      title="Delete"
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      onAction={async () => {
        if (
          await confirmAlert({
            title: "Are you sure?",
            icon: Icon.Trash,
            primaryAction: {
              title: "Delete",
              style: Alert.ActionStyle.Destructive,
            },
          })
        ) {
          props.onDelete();
        }
      }}
    />
  );
}

export default DeleteItemAction;
