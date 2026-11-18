/**
 * Generic form submission handler hook.
 */

import { showToast, Toast, popToRoot, open } from "@raycast/api";
import { useState, useCallback } from "react";
import { getErrorMessage } from "../lib/errors";

interface UseFormSubmitOptions<T> {
  /** Async function that performs the submission */
  onSubmit: () => Promise<T>;
  /** Toast title shown while submitting */
  loadingMessage?: string;
  /** Toast title shown on success */
  successMessage?: string;
  /** Optional secondary message on success */
  successDescription?: string;
  /** Whether to return to root after success (default: true) */
  returnToRoot?: boolean;
  /** Optional URL to offer opening after success */
  openUrl?: string;
  /** Optional URL button title */
  openUrlTitle?: string;
}

interface UseFormSubmitResult {
  isSubmitting: boolean;
  submit: () => Promise<void>;
}

export function useFormSubmit<T>({
  onSubmit,
  loadingMessage = "Submitting...",
  successMessage = "Success",
  successDescription,
  returnToRoot = true,
  openUrl,
  openUrlTitle = "Open",
}: UseFormSubmitOptions<T>): UseFormSubmitResult {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(async () => {
    // Prevent concurrent submissions
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      await showToast({ style: Toast.Style.Animated, title: loadingMessage });

      await onSubmit();

      const toast = await showToast({
        style: Toast.Style.Success,
        title: successMessage,
        ...(successDescription ? { message: successDescription } : {}),
      });

      if (openUrl) {
        toast.primaryAction = {
          title: openUrlTitle,
          onAction: () => open(openUrl),
        };
      }

      if (returnToRoot) {
        // Delay popToRoot when there's an openUrl action so user can see and use it
        if (openUrl) {
          setTimeout(() => popToRoot(), 1500);
        } else {
          await popToRoot();
        }
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed",
        message: getErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, onSubmit, loadingMessage, successMessage, successDescription, returnToRoot, openUrl, openUrlTitle]);

  return { isSubmitting, submit };
}
