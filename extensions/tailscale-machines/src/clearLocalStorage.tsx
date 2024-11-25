import { LocalStorage, showToast, ToastStyle } from "@raycast/api";

export default async function Command() {
  try {
    await LocalStorage.clear();
    await showToast(ToastStyle.Success, "Success", "LocalStorage has been cleared");
  } catch (error) {
    await showToast(ToastStyle.Failure, "Error", "Failed to clear LocalStorage");
  }
}
