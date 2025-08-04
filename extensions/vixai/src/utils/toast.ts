import { showToast, Toast } from "@raycast/api";

export async function toastError(params: { title: string; message: string }) {
  return showToast({
    style: Toast.Style.Failure,
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
