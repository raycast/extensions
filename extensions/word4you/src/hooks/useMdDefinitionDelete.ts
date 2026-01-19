import { Toast, showToast } from "@raycast/api";
import { deleteMdDefinitionFromVocabulary } from "../services/mdDefinitionService";

export function useMdDefinitionDelete(onMdDefinitionDeleted?: () => Promise<void>) {
  const handleDelete = async (timestamp: string) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Deleting...`,
    });

    const success = await deleteMdDefinitionFromVocabulary(timestamp, (message: string) => {
      toast.message = message;
    });

    if (success) {
      toast.style = Toast.Style.Success;
      toast.title = "Entry deleted";

      if (onMdDefinitionDeleted) {
        await onMdDefinitionDeleted();
      }
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to delete entry";
    }
  };

  return {
    handleDelete,
  };
}
