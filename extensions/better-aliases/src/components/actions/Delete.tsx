import { Action, Alert, confirmAlert, Icon, Keyboard, showToast, Toast } from "@raycast/api";

interface DeleteActionProps {
  title?: string;
  itemName: string;
  itemType: "alias" | "snippet";
  onDelete: () => void;
  onSuccess?: () => void;
}

export function DeleteAction({ title = "Delete", itemName, itemType, onDelete, onSuccess }: DeleteActionProps) {
  const handleDelete = async () => {
    const confirmed = await confirmAlert({
      title: `Delete ${itemType}`,
      message: `Are you sure you want to delete "${itemName}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        onDelete();
        await showToast(Toast.Style.Success, `${itemType} deleted`, itemName);
        onSuccess?.();
      } catch (error) {
        await showToast(Toast.Style.Failure, "Failed to delete", String(error));
      }
    }
  };

  return (
    <Action
      title={title}
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={Keyboard.Shortcut.Common.Remove}
      onAction={handleDelete}
    />
  );
}
