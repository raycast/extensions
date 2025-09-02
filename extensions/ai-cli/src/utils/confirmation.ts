import { Alert, confirmAlert } from "@raycast/api";
import { showFailureToast, showSuccessToast } from "./toast";
import { messages } from "@/locale/en/messages";

export async function confirmDeletion(itemType: string, itemName: string): Promise<boolean> {
  return await confirmAlert({
    title: `Delete ${itemType}`,
    message: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
    primaryAction: {
      title: messages.confirmations.deleteButton,
      style: Alert.ActionStyle.Destructive,
    },
  });
}

export async function executeDeleteOperation<T>(
  itemType: string,
  itemName: string,
  deleteOperation: () => Promise<T>
): Promise<void> {
  try {
    await deleteOperation();
    showSuccessToast(`${itemType} Deleted`, `Successfully deleted "${itemName}"`);
  } catch (error) {
    showFailureToast(
      `Failed to Delete ${itemType}`,
      error instanceof Error ? error.message : messages.generic.unexpectedError
    );
  }
}
