import { showToast, ToastStyle } from "@raycast/api";

export const showError = (e: Error) => showToast(ToastStyle.Failure, e.message);
export const date = (date: Date) => date.toISOString().substring(0, 23);
