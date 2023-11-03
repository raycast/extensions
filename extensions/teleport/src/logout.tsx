import { showToast, Toast } from "@raycast/api";
import { logout } from "./utils";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Logging out...",
  });

  try {
    logout();
    toast.style = Toast.Style.Success;
    toast.title = "Logged out !";
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to logout !";
  }
}
