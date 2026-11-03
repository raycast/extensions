import { Clipboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

/** `onError` for read hooks: a failure toast that carries Copy Error. */
export const showReadFailure = (title: string) => async (error: Error) => {
  await showFailureToast(error, {
    title,
    primaryAction: { title: "Copy Error", onAction: () => Clipboard.copy(error.message) },
  });
};
