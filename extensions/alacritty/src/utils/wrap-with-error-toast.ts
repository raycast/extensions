import { Toast, showToast } from "@raycast/api";

export const wrapWithErrorToast = (fn: () => Promise<unknown>) => async () => {
  try {
    await fn();
  } catch (e) {
    await showToast({
      title: "Error",
      message: String(e),
      style: Toast.Style.Failure,
    });
  }
};
