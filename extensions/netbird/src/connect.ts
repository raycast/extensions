import { showToast, Toast, closeMainWindow } from "@raycast/api";
import { netbirdUp } from "./utils";

export default async function main() {
  try {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Connecting to NetBird",
      message: "Please wait...",
    });

    await netbirdUp();

    await toast.hide();

    await closeMainWindow({ clearRootSearch: true });

    await showToast({
      style: Toast.Style.Success,
      title: "Connected to NetBird",
      message: "",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to connect",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
