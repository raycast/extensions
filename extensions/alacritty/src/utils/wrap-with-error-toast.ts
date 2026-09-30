import { Toast, showToast } from "@raycast/api";

export const wrapWithErrorToast = (fn: () => Promise<unknown>) => async () => {
  try {
    await fn();
  } catch (e) {
    await showToast({
      title: "Error",
      message: e instanceof Error ? e.message : String(e),
      style: Toast.Style.Failure,
    });
  }
};
