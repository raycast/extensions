import { AxiosError, CanceledError } from "axios";
import { showToast, Toast } from "@raycast/api";

export function showErrorToast(error: AxiosError) {
  if (!isCancel(error)) {
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
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

function isCancel(value: AxiosError | CanceledError<never>): boolean {
  return value instanceof CanceledError;
}
