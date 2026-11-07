import { showFailureToast } from "@raycast/utils";
import { errorMessage } from "../core/errors";

/**
 * The helper offers the error as copied logs or as a prefilled bug report, so it only ever gets a fresh error that
 * carries the masked message.
 */
export async function showError(title: string, error: unknown): Promise<void> {
  await showFailureToast(new Error(errorMessage(error)), { title });
}

/** Wraps an action handler, so that a failed save shows a toast instead of ending as an unhandled rejection. */
export function guarded(title: string, action: () => Promise<unknown>): () => Promise<void> {
  return async () => {
    try {
      await action();
    } catch (error) {
      await showError(title, error);
    }
  };
}
