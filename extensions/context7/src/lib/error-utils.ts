import { Clipboard, Toast, showToast } from "@raycast/api";
import { logger } from "@chrismessina/raycast-logger";

export function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

export function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

/** Failure toast carrying a Copy Error action, so the message is always recoverable. */
export async function showErrorToast(title: string, error: unknown) {
  const message = toErrorMessage(error);
  logger.error(title, error);

  await showToast({
    style: Toast.Style.Failure,
    title,
    message,
    primaryAction: {
      title: "Copy Error",
      onAction: async () => {
        await Clipboard.copy(message);
      },
    },
  });

  return message;
}
