import { open, showHUD, showToast, Toast } from "@raycast/api";

export default async function Command() {
  try {
    await open("wattmeter://refresh?source=raycast");
    await showHUD("Wattmeter refreshing…");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to refresh Wattmeter",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
