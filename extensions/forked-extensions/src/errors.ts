import { open } from "@raycast/api";
import { HTTPError } from "got";
import { SubprocessError } from "nano-spawn";
import * as api from "./api.js";
import operation from "./operation.js";

/**
 * Handle different types of errors and show appropriate failure toasts.
 * @param error An unknown error to handle.
 */
export const handleError = async (error: unknown) => {
  if (error instanceof HTTPError) return handleGotHttpError(error);
  if (error instanceof SubprocessError) return handleSubprocessError(error);
  return operation.showFailureToast(error);
};

/**
 * Handle Got HTTPError and show a failure toast with re-authorization action.
 * @param error The HTTPError to handle.
 */
export const handleGotHttpError = (error: HTTPError) =>
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
        : undefined,
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
