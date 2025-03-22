import { Toast, showToast } from "@raycast/api";

export const showError = async (
  error: unknown,
  failureToastOptions: { title?: string | undefined; primaryAction?: Toast.ActionOptions | undefined } | undefined,
) => {
  await showToast({
    style: Toast.Style.Failure,
    title: failureToastOptions?.title || "❌ An error occurred. Please try again.",
  });
};
