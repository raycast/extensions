import { useState } from "react";
import { Toast, showToast } from "@raycast/api";
import { saveMdDefinitionToVocabulary } from "../services/mdDefinitionService";

export function useMdDefinitionSave(onMdDefinitionSaved?: () => Promise<void>, onAiResultCleared?: () => void) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (content: string) => {
    if (isSaving) return;

    setIsSaving(true);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving...",
    });

    const success = await saveMdDefinitionToVocabulary(content, (message: string) => {
      toast.message = message;
    });

    if (success) {
      toast.style = Toast.Style.Success;
      toast.title = "Entry saved";

      // Reload saved md definitions to include the new content
      if (onMdDefinitionSaved) {
        await onMdDefinitionSaved();
      }

      // Clear AI result since it's now saved
      if (onAiResultCleared) {
        onAiResultCleared();
      }
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to save entry";
    }

    setIsSaving(false);
  };

  return {
    isSaving,
    handleSave,
  };
}
