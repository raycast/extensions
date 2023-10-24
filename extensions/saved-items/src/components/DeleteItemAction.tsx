import { Action, Icon, Alert, confirmAlert } from "@raycast/api";

function DeleteItemAction(props: { onDelete: () => void }) {
  return (
    <Action
      icon={Icon.Trash}
      title="Delete"
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      onAction={async () => {
        if (
          await confirmAlert({
            title: "Are you sure?",
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
