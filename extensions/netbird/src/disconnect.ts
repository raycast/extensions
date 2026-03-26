import { showToast, Toast } from "@raycast/api";
import { netbirdDown } from "./utils";

export default async function main() {
  try {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Disconnecting from NetBird",
      message: "Please wait...",
    });

    await netbirdDown();

    toast.style = Toast.Style.Success;
    toast.title = "Disconnected from NetBird";
    toast.message = "";
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to disconnect",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
