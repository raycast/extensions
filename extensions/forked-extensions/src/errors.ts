import { Toast, open } from "@raycast/api";
import { HTTPError } from "got";
import { SubprocessError } from "nano-spawn";
import * as api from "./api.js";
import operation from "./operation.js";

/**
 * Options for error handling.
 */
type HandlerOptions = {
  /**
   * Options for the primary action button in the error toast.
   */
  primaryAction?: Toast.ActionOptions;
};

/**
 * Handle different types of errors and show appropriate failure toasts.
 * @param error An unknown error to handle.
 * @param handlerOptions Options for error handling.
 */
export const handleError = async (error: unknown, handlerOptions?: HandlerOptions) => {
  if (error instanceof HTTPError) return handleGotHttpError(error, handlerOptions);
  if (error instanceof SubprocessError) return handleSubprocessError(error);
  return operation.showFailureToast(error);
};

/**
 * Catch errors from an async task and handle them.
 * @param task The async task to execute.
 * @param handlerOptions Options for error handling.
 */
export const catchError = (task: () => Promise<void>, handlerOptions?: HandlerOptions) => async () => {
  try {
    await task();
  } catch (error) {
    handleError(error, handlerOptions);
  }
};

/**
 * Handle Got HTTPError and show a failure toast with re-authorization action.
 * @param error The HTTPError to handle.
 * @param handlerOptions Options for error handling.
 */
export const handleGotHttpError = (error: HTTPError, handlerOptions?: HandlerOptions) =>
  operation.showFailureToast([error.message, error.response.body].join("\n"), {
    title: error.message,
    message: error.response.body,
    primaryAction:
      // [TODO] Needs a better way to detect if the permission scope is insufficient.
      // For now, we just check if the status code is 422 Unprocessable Entity.
      error.response.statusCode === 422
        ? {
            title: "Re-authorize GitHub",
            onAction: async () => {
              // Remove the stored tokens to force re-authorization.
              await api.githubOauthService.client.removeTokens();
              // Due to Raycast `launchCommand` cannot launch itself, we need to use the URL scheme to open the extension as a workaround.
              await open("raycast://extensions/litomore/forked-extensions/manage-forked-extensions");
            },
          }
        : handlerOptions?.primaryAction,
  });

/**
 * Handle nano-spawn SubprocessError and show a failure toast.
 * @param error The SubprocessError to handle.
 */
export const handleSubprocessError = (error: SubprocessError) =>
  operation.showFailureToast([error.message, error.stderr].join("\n"), {
    title: error.message,
    message: error.stderr,
  });
