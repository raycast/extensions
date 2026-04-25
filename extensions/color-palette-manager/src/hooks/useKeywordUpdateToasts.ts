import { showToast, Toast } from "@raycast/api";
import { UpdateKeywordsPromiseResult } from "../types";

type UseKeywordUpdateToastsReturn = {
  showUpdateResult: (result: UpdateKeywordsPromiseResult) => void;
};

/**
 * Custom hook for handling keyword update toast notifications.
 */
export function useKeywordUpdateToasts(): UseKeywordUpdateToastsReturn {
  const showUpdateResult = (result: UpdateKeywordsPromiseResult) => {
    const { validKeywords, invalidKeywords, removedKeywords, duplicateKeywords, totalProcessed } = result;

    const totalSuccessful = validKeywords.length + removedKeywords.length;
    const hasInvalid = invalidKeywords.length > 0;
    const hasDuplicates = duplicateKeywords.length > 0;

    if (totalSuccessful === 0 && totalProcessed > 0) {
      // All keywords were invalid or duplicates
      if (hasInvalid && hasDuplicates) {
        showToast({
          style: Toast.Style.Failure,
          title: "No keywords updated.",
          message: `${invalidKeywords.length} invalid, ${duplicateKeywords.length} duplicate keywords`,
        });
      } else if (hasInvalid) {
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid keywords.",
          message: `${invalidKeywords.join(", ")}`,
        });
      } else if (hasDuplicates) {
        showToast({
          style: Toast.Style.Success,
          title: "No new keywords.",
          message: `${duplicateKeywords.join(", ")} already exist`,
        });
      }
    } else if (totalSuccessful > 0 && (hasInvalid || hasDuplicates)) {
      // Partial success
      showToast({
        style: Toast.Style.Success,
        title: `${totalSuccessful} keywords updated.`,
        message: hasInvalid
          ? `${invalidKeywords.length} invalid keywords skipped`
          : `${duplicateKeywords.length} duplicates skipped`,
      });
    } else if (totalSuccessful > 0) {
      // Complete success
      const addedCount = validKeywords.length;
      const removedCount = removedKeywords.length;

      if (addedCount > 0 && removedCount > 0) {
        showToast({
          style: Toast.Style.Success,
          title: "Keywords updated.",
          message: `${addedCount} added, ${removedCount} removed`,
        });
      } else if (addedCount > 0) {
        showToast({
          style: Toast.Style.Success,
          title: "Keywords added.",
          message: `${validKeywords.join(", ")}`,
        });
      } else if (removedCount > 0) {
        showToast({
          style: Toast.Style.Success,
          title: "Keywords removed.",
          message: `${removedKeywords.join(", ")}`,
        });
      }
    }
  };

  return { showUpdateResult };
}
