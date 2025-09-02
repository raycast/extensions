import { showToast, Toast } from "@raycast/api";

// Utility functions for consistent toast notifications

export const showSuccessToast = (title: string, message?: string): void => {
  void showToast({
    style: Toast.Style.Success,
    title,
    message,
  });
};

export const showFailureToast = (title: string, message?: string): void => {
  void showToast({
    style: Toast.Style.Failure,
    title,
    message,
  });
};

export const showAnimatedToast = (title: string, message?: string): void => {
  void showToast({
    style: Toast.Style.Animated,
    title,
    message,
  });
};

export const showCustomToast = (style: Toast.Style, title: string, message?: string): void => {
  void showToast({
    style,
    title,
    message,
  });
};
