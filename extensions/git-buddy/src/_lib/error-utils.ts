import { Toast, popToRoot, showToast } from "@raycast/api";

export async function handleError(errorMessage: string) {
  await popToRoot();
  await showToast({
    style: Toast.Style.Failure,
    title: "Error",
    message: errorMessage,
  });
}
