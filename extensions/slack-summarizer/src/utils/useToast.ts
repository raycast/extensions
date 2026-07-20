import { showToast, Toast } from "@raycast/api";
import { useEffect, useRef } from "react";

export function useToast() {
  // The toast instance
  const toastRef = useRef<Toast | null>(null);

  const updateToast = async (style: Toast.Style, title: string, message?: string) => {
    if (!toastRef.current) {
      toastRef.current = await showToast({ style, title, message });
    } else {
      toastRef.current.style = style;
      toastRef.current.title = title;
      toastRef.current.message = message ?? "";
    }
  };

  // Show an animated "loading…" toast
  const showLoadingToast = (title: string) => updateToast(Toast.Style.Animated, title);

  // Flip the same toast to "success"
  const showSuccessToast = (title: string, message?: string) => updateToast(Toast.Style.Success, title, message);

  // Flip the same toast to "error"
  const showErrorToast = (title: string, error: unknown) =>
    updateToast(Toast.Style.Failure, title, error instanceof Error ? error.message : String(error));

  // Hide and forget the toast
  const hideToast = () => {
    toastRef.current?.hide();
    toastRef.current = null;
  };

  // Clean up automatically when the component unmounts
  useEffect(() => () => void toastRef.current?.hide(), []);

  return { showLoadingToast, showSuccessToast, showErrorToast, hideToast };
}
