import { ToastStyle } from "@raycast/api";

export const createResolvedToast = (
  toast: any,
  title: string,
  message?: string
): { error: () => void; success: () => void } => {
  toast.title = title;
  toast.message = message;
  const error = (): void => {
    toast.style = ToastStyle.Failure;
  };

  const success = (): void => {
    toast.style = ToastStyle.Success;
  };

  return { error, success };
};
