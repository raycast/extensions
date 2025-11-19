import { showToast, Toast, closeMainWindow } from "@raycast/api";
import { findXcodesPath, updateList } from "./utils/xcodes";

export default async function Command() {
  const xcodesPath = findXcodesPath();

  if (!xcodesPath) {
    await showToast({
      style: Toast.Style.Failure,
      title: "xcodes not found",
      message: "Install with: brew install xcodesorg/made/xcodes",
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Updating Xcode list...",
  });

  try {
    await updateList(xcodesPath);

    toast.style = Toast.Style.Success;
    toast.title = "Xcode list updated successfully";

    // Close the window after success
    await closeMainWindow();
  } catch (error: any) {
    toast.style = Toast.Style.Failure;
    toast.title = "Error";
    toast.message = error.message;
  }
}
