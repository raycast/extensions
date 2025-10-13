import { showToast, Toast } from "@raycast/api";

export function showError(e?: Error | unknown) {
  // await showHUD(e instanceof Error ? e.message : "An error occurred", {
  //   clearRootSearch: true,
  // });

  showToast({
    style: Toast.Style.Failure,
    title: "Error",
    message: e instanceof Error ? e.message : "An error occurred",
  }).then();
}
