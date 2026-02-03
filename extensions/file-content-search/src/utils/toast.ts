import { showToast, Toast } from "@raycast/api";

export type ToastInstance = Toast;

type LoadingOptions = {
  title: string;
  message?: string;
  onCancel?: () => void;
};

export const toast = {
  success: (title: string) => showToast({ style: Toast.Style.Success, title }),
  error: (title: string, message?: string) =>
    showToast({ style: Toast.Style.Failure, title, message }),
  loading: async ({ title, message, onCancel }: LoadingOptions) => {
    const instance = await showToast({
      style: Toast.Style.Animated,
      title,
      message,
      primaryAction: onCancel
        ? {
            title: "Cancel",
            shortcut: { modifiers: ["cmd"], key: "." },
            onAction: (t) => {
              onCancel();
              t.hide();
            },
          }
        : undefined,
    });
    return instance;
  },
};
