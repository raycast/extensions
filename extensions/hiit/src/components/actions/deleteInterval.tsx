import { Action, Alert, Icon, confirmAlert } from "@raycast/api";
import { Item } from "../../types";

export function DeleteInterval(props: { item: Item; type: string; onDelete: (item: Item) => void }) {
  const { item, type } = props;

  return (
    <Action
      title={`Delete ${type}`}
      icon={Icon.Trash}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      style={Action.Style.Destructive}
      onAction={async () => {
        if (
          await confirmAlert({
            title: "Are you sure?",
            message: `This will delete "${item.title}"`,
            icon: Icon.Trash,
            primaryAction: {
              title: "Delete",
              style: Alert.ActionStyle.Destructive,
            },
          })
        ) {
          props.onDelete(item);
        }
      }}
    />
  );
}
