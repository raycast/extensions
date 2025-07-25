import { Toast, showToast } from "@raycast/api";
import { deleteWordFromVocabulary } from "../services/wordService";

export function useWordDelete(onWordDeleted?: () => Promise<void>) {
  const handleDelete = async (word: string, timestamp?: string) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Deleting "${word}"...`,
    });

    try {
      const success = await deleteWordFromVocabulary(word, timestamp, (message) => {
        toast.message = message;
      });

      if (success) {
        toast.style = Toast.Style.Success;
        toast.title = "Word deleted successfully!";

        if (onWordDeleted) {
          await onWordDeleted();
        }
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to delete word";
        toast.message = "Please check your configuration";
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error deleting word";
      toast.message = String(error);
    }
  };

  return {
    handleDelete,
  };
}
