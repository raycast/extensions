/**
 * Toast utilities for the Brew extension.
 *
 * Provides functions for displaying toast notifications.
 */

import { Clipboard, Toast, showHUD, showToast } from "@raycast/api";
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
 * Finish an in-progress action toast.
 *
 * Raycast's toast update/hide messages carry no toast id: they act on whichever
 * toast is currently on screen. Mutating the animated toast in place therefore
 * risks leaving its "Cancel" action attached to a finished operation. Showing a
 * fresh toast makes that structurally impossible: `showToast` replaces the
 * visible toast outright, so it needs no `hide()` first — and adding one would
 * open an `await` gap in which another writer could claim the slot.
 */
async function settle(toast: Toast, style: Toast.Style, title: string, hudMessage: string): Promise<void> {
  if (preferences.closeAfterAction) {
    // Close window and show HUD. Dismissal is best-effort: it must not gate the HUD.
    toast.hide().catch((err) => uiLogger.log("Failed to hide action toast", err));
    await showHUD(hudMessage);
  } else {
    await showToast({ style, title });
  }
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
      await settle(toast, Toast.Style.Success, message, `✅ ${message}`);
    },
    showFailureHUD: async (message: string) => {
      await settle(toast, Toast.Style.Failure, message, `❌ ${message}`);
    },
    hide: () => {
      toast.hide();
    },
  };
}

/**
 * Show a Brew-specific failure toast with error details and optional retry action.
 *
 * Unlike the standard `showFailureToast` from `@raycast/utils`, this function:
 * - Detects Homebrew lock errors and shows "Brew is Busy" with helpful context
 * - Logs structured error details (stderr, exit code, error type) via uiLogger
 * - Provides a "Copy Logs" action with brew-specific troubleshooting tips
 * - Supports conditional retry for recoverable brew errors
 * - Silently ignores AbortError (user-initiated cancellations)
 *
 * Use this for all Homebrew operations. Use `showFailureToast` from `@raycast/utils`
 * for general extension errors unrelated to brew commands.
 */
export async function showBrewFailureToast(
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
  const hasStructuredOutput = Boolean(execError.stderr || execError.stdout);
  const rawLogOutput = [
    `${toastTitle}`,
    `Error type: ${error.name}`,
    execError.code !== undefined ? `Exit code: ${execError.code}` : undefined,
    hasStructuredOutput ? undefined : `Message: ${error.message}`,
    execError.stderr ? `stderr:\n${execError.stderr}` : undefined,
    execError.stdout ? `stdout:\n${execError.stdout}` : undefined,
    isLockError
      ? "Tip: Check Activity Monitor or run 'ps aux | grep brew' in Terminal to see what's running."
      : undefined,
  ]
    .filter(Boolean)
    .join("\n\n");

  const toastOptions: Toast.Options = {
    style: Toast.Style.Failure,
    title: toastTitle,
    message: errorMessage,
    primaryAction: {
      title: "Copy Logs",
      onAction: () => {
        Clipboard.copy(rawLogOutput);
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
