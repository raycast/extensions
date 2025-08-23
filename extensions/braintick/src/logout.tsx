import { Toast, closeMainWindow, showToast } from "@raycast/api";
import { logout } from "./lib/auth";

export default async function Logout() {
  try {
    await logout();
    await showToast({
      style: Toast.Style.Success,
      title: "Goodbye! 👋",
      message: "Successfully logged out of Braintick",
    });
    await closeMainWindow();
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: "Failed to logout",
    });
  }
}
