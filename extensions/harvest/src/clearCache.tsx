import { clearLocalStorage, showToast, ToastStyle } from "@raycast/api";

export default async function main() {
  showToast(ToastStyle.Animated, "Loading...");
  await clearLocalStorage();
  showToast(ToastStyle.Success, "Done");
}
