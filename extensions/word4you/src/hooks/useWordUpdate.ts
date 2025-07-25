import { Toast, showToast } from "@raycast/api";
import { getWordExplanation, updateWordInVocabulary } from "../services/wordService";

export function useWordUpdate(onWordUpdated?: () => Promise<void>) {
  const handleUpdate = async (word: string) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Querying fresh content for "${word}"...`,
    });

    try {
      // First query the word to get fresh content
      const freshResult = await getWordExplanation(word);

      if (!freshResult) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to get fresh content";
        toast.message = "Please check your configuration";
        return;
      }

      toast.title = `Updating "${word}"...`;

      // The CLI expects just the content without the "## word" header
      // as the word is passed separately as a parameter
      const success = await updateWordInVocabulary(word, freshResult.raw_output, undefined, (message) => {
        toast.message = message;
      });

      if (success) {
        toast.style = Toast.Style.Success;
        toast.title = "Word updated successfully!";

        if (onWordUpdated) {
          await onWordUpdated();
        }
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to update word";
      }
    } catch {
      toast.style = Toast.Style.Failure;
      toast.title = "Error updating word";
    }
  };

  return {
    handleUpdate,
  };
}
