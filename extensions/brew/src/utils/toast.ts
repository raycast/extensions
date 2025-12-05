/**
 * Toast utilities for the Brew extension.
 *
 * Provides functions for displaying toast notifications.
 */

import { Clipboard, PopToRootType, Toast, showHUD } from "@raycast/api";
import { ExecError } from "./types";
import { uiLogger } from "./logger";
import { isRecoverableError, getErrorMessage, isBrewLockError } from "./errors";
import { preferences } from "./preferences";

/// Toast Types

interface ActionToastOptions {
  title: string;
  message?: string;
  cancelable: boolean;
}

/**
 * Result from showActionToast that allows updating progress and showing final HUD.
 */
export interface ActionToastHandle {
  /** AbortController for cancellation (if cancelable) */
  abort?: AbortController;
  /** Update the toast message to show progress */
  updateMessage: (message: string) => void;
  /** Update the toast title */
  updateTitle: (title: string) => void;
  /** Show success HUD (persists after Raycast closes) */
  showSuccessHUD: (message: string) => Promise<void>;
  /** Show failure HUD (persists after Raycast closes) */
  showFailureHUD: (message: string) => Promise<void>;
  /** Hide the toast */
  hide: () => void;
}

/**
 * Show an animated toast with optional cancel action.
 * Returns a handle for updating progress and showing final HUD notifications.
 */
export function showActionToast(actionOptions: ActionToastOptions): ActionToastHandle {
  const options: Toast.Options = {
    style: Toast.Style.Animated,
    title: actionOptions.title,
    message: actionOptions.message,
  };

  let controller: AbortController | undefined;

  if (actionOptions.cancelable) {
    controller = new AbortController();
    options.primaryAction = {
      title: "Cancel",
      onAction: () => {
        controller?.abort();
        toast.hide();
      },
    };
  }

  const toast = new Toast(options);
  toast.show();

  return {
    abort: controller,
    updateMessage: (message: string) => {
      toast.message = message;
    },
    updateTitle: (title: string) => {
      toast.title = title;
    },
    showSuccessHUD: async (message: string) => {
      toast.hide();
      if (preferences.closeAfterAction) {
        await showHUD(`✅ ${message}`);
      } else {
        // Keep window open by using Suspended pop behavior
        await showHUD(`✅ ${message}`, { popToRootType: PopToRootType.Suspended });
      }
    },
    showFailureHUD: async (message: string) => {
      toast.hide();
      if (preferences.closeAfterAction) {
        await showHUD(`❌ ${message}`);
      } else {
        // Keep window open by using Suspended pop behavior
        await showHUD(`❌ ${message}`, { popToRootType: PopToRootType.Suspended });
      }
    },
    hide: () => {
      toast.hide();
    },
  };
}

/**
 * Show a failure toast with error details and optional retry action.
 */
export async function showFailureToast(
  title: string,
  error: Error,
  options?: { retryAction?: () => Promise<void> },
): Promise<void> {
  if (error.name === "AbortError") {
    uiLogger.log("Operation aborted by user");
    return;
  }

  const execError = error as ExecError;
  const errorMessage = getErrorMessage(error);
  const isLockError = isBrewLockError(error);

  uiLogger.error(title, {
    errorType: error.name,
    message: error.message,
    stderr: execError.stderr,
    code: execError.code,
    recoverable: isRecoverableError(error),
    isLockError,
  });

  // Use a more specific title for lock errors
  const toastTitle = isLockError ? "Brew is Busy" : title;

  const toastOptions: Toast.Options = {
    style: Toast.Style.Failure,
    title: toastTitle,
    message: errorMessage,
    primaryAction: {
      title: "Copy Logs",
      onAction: () => {
        // For lock errors, include more context in the copied log
        const logContent = isLockError
          ? `${toastTitle}\n${errorMessage}\n\nTip: Check Activity Monitor or run 'ps aux | grep brew' in Terminal to see what's running.`
          : errorMessage;
        Clipboard.copy(logContent);
      },
    },
  };

  // Add retry action for recoverable errors (including lock errors)
  if (isRecoverableError(error) && options?.retryAction) {
    const retryAction = options.retryAction;
    toastOptions.secondaryAction = {
      title: "Retry",
      onAction: async (toast) => {
        toast.style = Toast.Style.Animated;
        toast.title = "Retrying...";
        toast.message = undefined;
        try {
          await retryAction();
          toast.style = Toast.Style.Success;
          toast.title = "Success";
        } catch (retryError) {
          toast.style = Toast.Style.Failure;
          toast.title = isBrewLockError(retryError) ? "Brew is Busy" : title;
          toast.message = getErrorMessage(retryError);
        }
      },
    };
  }

  const toast = new Toast(toastOptions);
  await toast.show();
}
