import { BaseHTTPError } from "@dopplerhq/node-sdk";
import { openExtensionPreferences } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export async function handleError(error: Error | BaseHTTPError) {
  let title = "Doppler Error";
  let message = error.message === "[object Object]" ? "Something went wrong" : error.message;

  if ("title" in error) title = error.title;
  if ("detail" in error) {
    if (typeof error.detail === "string") message = error.detail;
    else {
      const details = error.detail as unknown as { messages: string[]; success: false };
      message = details.messages[0];
    }
  }

  await showFailureToast(message, {
    title,
    primaryAction:
      title !== "Unauthorized"
        ? undefined
        : {
            title: "Open Extension Preferences",
            onAction: openExtensionPreferences,
          },
  });
}
