import { Action, Alert, Icon, confirmAlert } from "@raycast/api";
import { Item } from "../../types";

export function DeleteInterval(props: { item: Item; onDelete: (item: Item) => void }) {
  const item = props.item;

  return (
    <Action
      title="Delete Interval"
      icon={Icon.Pencil}
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
