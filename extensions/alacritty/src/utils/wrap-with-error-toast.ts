import { Toast, showToast } from "@raycast/api";

export const wrapWithErrorToast = (fn: () => Promise<unknown>) => async () => {
  try {
    await fn();
  } catch (e) {
    showToast({
      title: "Error",
      message: e instanceof Error ? e.message : "Unknown error",
      style: Toast.Style.Failure,
    });
  }
};
