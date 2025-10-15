import { useCallback } from "react";
import { apiClient } from "../lib/api-client";
import { ProjectType, EntryFormData } from "../types";
import {
  showSuccessToast,
  showErrorToast,
  parseTimeInput,
  combineDescriptionAndTags,
  dateOnTimezone,
} from "../utils";
import { TOAST_MESSAGES } from "../constants";

interface UseTimerActionsOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const useTimerActions = (options: UseTimerActionsOptions = {}) => {
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

  const startTimer = useCallback(
    async (project: ProjectType) => {
      await handleApiCall(
        () => apiClient.put(`/projects/${project.id}/timer/start`),
        `Started timer for ${project.name}`,
        TOAST_MESSAGES.ERROR.FAILED_TO_START_TIMER,
        TOAST_MESSAGES.SUCCESS.TIMER_STARTED,
      );
    },
    [handleApiCall],
  );

  const pauseTimer = useCallback(
    async (project: ProjectType) => {
      await handleApiCall(
        () => apiClient.put(`/projects/${project.id}/timer/pause`),
        `Paused timer for ${project.name}`,
        TOAST_MESSAGES.ERROR.FAILED_TO_PAUSE_TIMER,
        TOAST_MESSAGES.SUCCESS.TIMER_PAUSED,
      );
    },
    [handleApiCall],
  );

  const discardTimer = useCallback(
    async (project: ProjectType) => {
      await handleApiCall(
        () => apiClient.delete(`/projects/${project.id}/timer`),
        `Timer discarded for ${project.name} (time not saved)`,
        TOAST_MESSAGES.ERROR.FAILED_TO_DISCARD_TIMER,
        TOAST_MESSAGES.SUCCESS.TIMER_DISCARDED,
      );
    },
    [handleApiCall],
  );

  const logTimer = useCallback(
    async (projectId: string, entryData: EntryFormData) => {
      const payload = {
        minutes: parseTimeInput(entryData.minutes),
        description: combineDescriptionAndTags(
          entryData.description,
          entryData.tags,
        ),
        entry_date: dateOnTimezone(entryData.date),
      };

      await handleApiCall(
        () => apiClient.put(`/projects/${projectId}/timer/log`, payload),
        `Timer logged for project`,
        TOAST_MESSAGES.ERROR.FAILED_TO_LOG_TIMER,
        TOAST_MESSAGES.SUCCESS.TIMER_LOGGED,
      );
    },
    [handleApiCall],
  );

  return {
    startTimer,
    pauseTimer,
    discardTimer,
    logTimer,
  };
};
