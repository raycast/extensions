import { showToast, Toast } from "@raycast/api";
import { AxiosError } from "axios";

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function handleUseCachedPromiseError(error: unknown) {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { errors: { message: string }[] };

    return showToast({ style: Toast.Style.Failure, title: error.message, message: data.errors?.[0].message });
  }

  if (error instanceof Error) {
    return showToast({ style: Toast.Style.Failure, title: error.message });
  }

  return showToast({ style: Toast.Style.Failure, title: "An unexpected error happened", message: String(error) });
}
