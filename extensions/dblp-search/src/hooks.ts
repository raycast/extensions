import { showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";

/**
 * Thin wrapper around usePromise that surfaces errors as a failure toast
 * with a consistent title.
 */
export function useDblp<T, A extends unknown[]>(
  fn: (...args: A) => Promise<T>,
  args: A,
  errorTitle: string,
) {
  return usePromise(fn, args, {
    onError: async (error) => {
      await showToast({
        style: Toast.Style.Failure,
        title: errorTitle,
        message: error instanceof Error ? error.message : String(error),
      });
    },
  });
}
