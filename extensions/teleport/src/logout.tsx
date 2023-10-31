import { showToast, Toast } from "@raycast/api";
import { logout } from "./utils";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Logging out...",
  });

  try {
    const result = logout();

    toast.style = Toast.Style.Success;
    toast.title = "Logged out !";
    toast.message = result.stdout.toString();
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to logout !";
    if (err instanceof Error) {
      toast.message = err.message;
    }
  }
}
