import { Toast } from "@raycast/api";

export function hideToast(toast: Toast, delay = 0) {
  setTimeout(async () => {
    await toast.hide();
  }, delay);
}
