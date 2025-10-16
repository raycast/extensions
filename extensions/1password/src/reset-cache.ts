import { showToast, Toast } from "@raycast/api";
import { op } from "./v8/utils";

export default async function resetCache() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Clearing cache...",
  });

  try {
    op(["signout", "--all"]);
    toast.style = Toast.Style.Success;
    toast.title = "Cleared cache";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to clear cache";
    if (error instanceof Error) {
      toast.message = error.message;
    }
  }
}
