import { useCallback } from "react";
import { apiClient } from "../lib/api-client";
import { EntryFormData } from "../types";
import {
  dateOnTimezone,
  parseTimeInput,
  combineDescriptionAndTags,
  showSuccessToast,
  showErrorToast,
} from "../utils";
import { TOAST_MESSAGES } from "../constants";

interface UseEntrySubmissionOptions {
  onSuccess?: () => void;
}

export const useEntrySubmission = (options: UseEntrySubmissionOptions = {}) => {
  const { onSuccess } = options;

  const submitEntry = useCallback(
    async (entryData: EntryFormData) => {
      try {
        const payload = {
          minutes: parseTimeInput(entryData.minutes),
          project_name: entryData.project_name,
          description: combineDescriptionAndTags(
            entryData.description,
            entryData.tags,
          ),
          date: dateOnTimezone(entryData.date),
        };

        const response = await apiClient.post("/entries", payload);

        if (!response.success) {
          throw new Error(response.error || "Failed to create entry");
        }

        showSuccessToast(
          TOAST_MESSAGES.SUCCESS.ENTRY_ADDED,
          TOAST_MESSAGES.SUCCESS.ENTRY_ADDED_DESCRIPTION,
        );

        onSuccess?.();
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : TOAST_MESSAGES.ERROR.UNKNOWN_ERROR;

        showErrorToast(TOAST_MESSAGES.ERROR.FAILED_TO_ADD_ENTRY, errorMessage);
      }
    },
    [onSuccess],
  );

  return {
    submitEntry,
  };
};
