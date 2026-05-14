import { showToast, Toast } from "@raycast/api";

export default async function openRandomBookmark() {
  await showToast({
    title: "Pocket is no longer available",
    style: Toast.Style.Failure,
    message: "You can uninstall from Preferences",
  });
}
