import { showToast, Toast } from "@raycast/api";

export const toastUtils = {
  loading: (title: string, message?: string) =>
    showToast({
      style: Toast.Style.Animated,
      title,
      message,
    }),

  success: (title: string, message?: string) =>
    showToast({
      style: Toast.Style.Success,
      title,
      message,
    }),

  error: (title: string, message?: string) =>
    showToast({
      style: Toast.Style.Failure,
      title,
      message,
    }),

  apiError: (error: unknown, title = "Operation Failed") => {
    const message = error instanceof Error ? error.message : String(error);
    showToast({
      style: Toast.Style.Failure,
      title,
      message,
    });
  },
};
