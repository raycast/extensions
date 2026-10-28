import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { newWindow } from "./safari";

export default async function Command() {
  try {
    // Dismiss Raycast before Safari activates so it does not reclaim keyboard focus.
    await closeMainWindow();
    await newWindow();
  } catch (error) {
    console.error(error);

    await showToast({
      style: Toast.Style.Failure,
      title: "Could not complete New Window",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
