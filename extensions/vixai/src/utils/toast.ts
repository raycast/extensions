import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export async function toastError(error: unknown, params: { title: string; message: string }) {
  return showFailureToast(error, {
    title: params.title,
    message: params.message,
  });
}

export async function toastSuccess(params: { title: string; message: string }) {
  return showToast({
    style: Toast.Style.Success,
    title: params.title,
    message: params.message,
  });
}
