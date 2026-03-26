import { showToast, Toast } from "@raycast/api";
import { netbirdUp } from "./utils";

export default async function main() {
  try {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Connecting to NetBird",
      message: "Please wait...",
    });

    await netbirdUp();

    toast.style = Toast.Style.Success;
    toast.title = "Connected to NetBird";
    toast.message = "";
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to connect",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
