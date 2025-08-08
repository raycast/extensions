import { Toast, showToast } from "@raycast/api";
import { getMdDefinitionExplanation, updateMdDefinitionInVocabulary } from "../services/mdDefinitionService";

export function useMdDefinitionUpdate(onMdDefinitionUpdated?: () => Promise<void>) {
  const handleUpdate = async (text: string, existingTimestamp: string) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Querying fresh content for "${text}"...`,
    });

    // First query the text to get fresh content
    const freshResult = await getMdDefinitionExplanation(text);

    if (!freshResult) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to get fresh content";
      return;
    }

    toast.title = `Updating...`;

    const success = await updateMdDefinitionInVocabulary(existingTimestamp, freshResult.raw_output, (message) => {
      toast.message = message;
    });

    if (success) {
      toast.style = Toast.Style.Success;
      toast.title = "Entry updated";

      if (onMdDefinitionUpdated) {
        await onMdDefinitionUpdated();
      }
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update entry";
    }
  };

  return {
    handleUpdate,
  };
}
