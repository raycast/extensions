import { Action, Alert, Icon, Keyboard, Toast, showToast, confirmAlert } from "@raycast/api";
import { Item, EnhancedItem } from "../../types";
import { deleteItem } from "../../storage";

interface DeleteFastingProps {
  item: Item;
  revalidate: () => Promise<EnhancedItem[]>;
}

export function DeleteFasting({ item, revalidate }: DeleteFastingProps) {
  const handleDelete = async () => {
    const options = {
      title: "Delete Fast",
      message: "Are you sure you want to delete this fast?",
      icon: Icon.Trash,
      style: Alert.ActionStyle.Destructive,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
      rememberUserChoice: true,
    };

    if (await confirmAlert(options)) {
      await deleteItem(item);
      await showToast({ title: "Fast deleted", style: Toast.Style.Success });
      revalidate();
    }
  };

  return (
    <Action
      title="Delete Fast"
      icon={Icon.Trash}
      shortcut={Keyboard.Shortcut.Common.Remove}
      style={Action.Style.Destructive}
      onAction={handleDelete}
    />
  );
}
