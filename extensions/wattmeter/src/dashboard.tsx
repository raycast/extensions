import { open, showHUD, showToast, Toast } from "@raycast/api";

export default async function Command() {
  try {
    await open("wattmeter://open?source=raycast");
    await showHUD("Opening Wattmeter…");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open Wattmeter",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
