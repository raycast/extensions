import { showToast, Toast, closeMainWindow } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { netbirdDown } from "./utils";

export default async function main() {
  try {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Disconnecting from NetBird",
      message: "Please wait...",
    });

    await netbirdDown();

    await toast.hide();

    await closeMainWindow({ clearRootSearch: true });

    await showToast({
      style: Toast.Style.Success,
      title: "Disconnected from NetBird",
      message: "",
    });
  } catch (error) {
    await showFailureToast(error, { title: "Failed to disconnect" });
  }
}
