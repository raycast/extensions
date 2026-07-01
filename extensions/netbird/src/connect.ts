import { showToast, Toast, closeMainWindow } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
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
    await showFailureToast(error, { title: "Failed to connect" });
  }
}
