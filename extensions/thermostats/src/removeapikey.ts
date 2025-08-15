import { closeMainWindow, LocalStorage, showToast, Toast } from "@raycast/api";

export default async function Command() {
  await LocalStorage.removeItem("seam_api_key");
  closeMainWindow();
  await showToast({
    style: Toast.Style.Success,
    title: "Seam API Key Removed",
  });
}
