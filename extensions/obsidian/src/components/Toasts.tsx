import { showToast, Toast } from "@raycast/api";

export function pathErrorToast() {
  showToast({
    title: "Path Error",
    message: "Something went wrong with your vault path. There are no paths to select from.",
    style: Toast.Style.Failure,
  });
}
