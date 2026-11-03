import { showToast, Toast } from "@raycast/api";
import { errorMessage } from "../core/errors";

export async function showError(title: string, error: unknown): Promise<void> {
  await showToast({ style: Toast.Style.Failure, title, message: errorMessage(error) });
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
