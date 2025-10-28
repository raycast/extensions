import { useCallback } from "react";
import { apiClient } from "../lib/api-client";
import { showSuccessToast, showErrorToast } from "../utils";
import { TOAST_MESSAGES } from "../constants";

interface UseEntryActionsOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const useEntryActions = (options: UseEntryActionsOptions = {}) => {
  const { onSuccess, onError } = options;

  const handleApiCall = useCallback(
    async <T>(
      apiCall: () => Promise<{ success: boolean; error?: string; data?: T }>,
      successMessage: string,
      errorTitle: string,
      successTitle: string,
    ) => {
      try {
        const result = await apiCall();

        if (!result.success) {
          const errorMessage =
            result.error || TOAST_MESSAGES.ERROR.UNKNOWN_ERROR;
          showErrorToast(errorTitle, errorMessage);
          onError?.(errorMessage);
          return;
        }

        showSuccessToast(successTitle, successMessage);
        onSuccess?.();
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : TOAST_MESSAGES.ERROR.UNKNOWN_ERROR;
        showErrorToast(errorTitle, errorMessage);
        onError?.(errorMessage);
      }
    },
    [onSuccess, onError],
  );

  const deleteEntry = useCallback(
    async (entryId: string) => {
      await handleApiCall(
        () => apiClient.delete(`/entries/${entryId}`),
        TOAST_MESSAGES.SUCCESS.ENTRY_DELETED_DESCRIPTION,
        TOAST_MESSAGES.ERROR.FAILED_TO_DELETE_ENTRY,
        TOAST_MESSAGES.SUCCESS.ENTRY_DELETED,
      );
    },
    [handleApiCall],
  );

  return {
    deleteEntry,
  };
};
