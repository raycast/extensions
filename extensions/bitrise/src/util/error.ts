import { showToast, Toast } from "@raycast/api";

export function handleError(error: Error) {
  showToast({
    style: Toast.Style.Failure,
    title: "Something went wrong",
    message: error.message,
  });
}
