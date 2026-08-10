import { showToast, Toast } from "@raycast/api";

export function showEagleNotOpenToast() {
  showToast({
    style: Toast.Style.Failure,
    title: "You'll need to have Eagle open to using this extension",
  });
}
