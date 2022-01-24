import { showToast, ToastStyle } from "@raycast/api";

export const showError = (e: Error) => showToast(ToastStyle.Failure, e.message);
