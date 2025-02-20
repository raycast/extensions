import { showToast, Toast } from "@raycast/api";

export class ToastManager {
  static success(title: string, message?: string): void {
    showToast({
      style: Toast.Style.Success,
      title,
      message,
    });
  }

  static error(title: string, message?: string): void {
    showToast({
      style: Toast.Style.Failure,
      title,
      message,
    });
  }

  static warning(title: string, message?: string): void {
    showToast({
      style: Toast.Style.Failure, // Raycast doesn't have a warning style
      title,
      message,
    });
  }

  static loading(title: string, message?: string): void {
    showToast({
      style: Toast.Style.Animated,
      title,
      message,
    });
  }
}
