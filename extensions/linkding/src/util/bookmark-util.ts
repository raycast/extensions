import axios, { AxiosError } from "axios";
import { showToast, Toast } from "@raycast/api";

export function showErrorToast(error?: Error | AxiosError) {
  if (!axios.isCancel(error)) {
    showToast({
      style: Toast.Style.Failure,
      title: "Something went wrong",
      ...(error && error.message ? { message: error.message } : {}),
    });
  }
}

export function showSuccessToast(message: string) {
  showToast({
    style: Toast.Style.Success,
    title: "Success",
    message,
  });
}

export function validateUrl(url: string) {
  return url.startsWith("http://") || url.startsWith("https://");
}
