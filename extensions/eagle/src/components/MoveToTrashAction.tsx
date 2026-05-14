import { Action, Icon, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { moveToTrash } from "../utils/api";
import type { Item } from "../@types/eagle";

interface MoveToTrashActionProps {
  item: Item;
  onUpdate?: () => void;
}

export function MoveToTrashAction({ item, onUpdate }: MoveToTrashActionProps) {
  const handleMoveToTrash = async () => {
    const confirmed = await confirmAlert({
      title: "Move to Trash?",
      message: `Are you sure you want to move "${item.name}" to trash?`,
      primaryAction: {
        title: "Move to Trash",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Moving to trash...",
      });

      await moveToTrash([item.id]);

      await showToast({
        style: Toast.Style.Success,
        title: "Moved to trash",
        message: item.name,
      });

      // Call the callback if provided (to refresh the list)
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      await showFailureToast(error, { title: "Failed to move to trash" });
    }
  };

  return (
    <Action
      title="Move to Trash"
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      onAction={handleMoveToTrash}
    />
  );
}
