import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { closeOtherTabs } from "./safari";

export default async function Command() {
  try {
    await closeOtherTabs();
    await closeMainWindow();
    await showToast({
      style: Toast.Style.Success,
      title: "Closed other tabs",
    });
  } catch (error) {
    console.error(error);

    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to close other tabs",
      message: error instanceof Error ? error.message : undefined,
    });
  }
}
