import { showFailureToast } from "@raycast/utils";

import { formatLoadError, isAuthRelatedError } from "./errors";

/** `useCachedPromise` / `usePromise` handler: full-screen auth UI handles credentials; toast everything else. */
export function onLoadError(toastTitle: string) {
  return (error: Error) => {
    if (isAuthRelatedError(error)) return;
    void showFailureToast(error, { title: toastTitle, message: formatLoadError(error) });
  };
}
