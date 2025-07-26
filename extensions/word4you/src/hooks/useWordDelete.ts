import { Toast, showToast } from "@raycast/api";
import { deleteWordFromVocabulary } from "../services/wordService";
import { showFailureToast } from "@raycast/utils";

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
      }
    } catch (error) {
      showFailureToast(error, { title: "Failed to delete word" });
    }
  };

  return {
    handleDelete,
  };
}
