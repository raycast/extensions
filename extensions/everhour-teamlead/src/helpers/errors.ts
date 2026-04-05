import { showToast, Toast } from "@raycast/api";
import { AxiosError } from "axios";

export function handleUseCachedPromiseError(error: Error): void {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.message || error.message;
    void showToast({
      style: Toast.Style.Failure,
      title: "Everhour API Error",
      message,
    });
    return;
  }

  void showToast({ style: Toast.Style.Failure, title: error.message });
}
