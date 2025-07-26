import { useState } from "react";
import { Toast, showToast } from "@raycast/api";
import { saveWordToVocabulary } from "../services/wordService";
import { showFailureToast } from "@raycast/utils";

export function useWordSave(onWordSaved?: () => Promise<void>, onAiResultCleared?: () => void) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (word: string, content: string) => {
    if (isSaving) return;

    setIsSaving(true);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving word to vocabulary...",
    });

    try {
      const success = await saveWordToVocabulary(word, content, (message) => {
        toast.message = message;
      });

      if (success) {
        toast.style = Toast.Style.Success;
        toast.title = "Word saved successfully!";

        // Reload saved words to include the new word
        if (onWordSaved) {
          await onWordSaved();
        }

        // Clear AI result since it's now saved
        if (onAiResultCleared) {
          onAiResultCleared();
        }
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to save word";
      }
    } catch (error) {
      showFailureToast(error, { title: "Failed to save word" });
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isSaving,
    handleSave,
  };
}
