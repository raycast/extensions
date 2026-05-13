import { open, showHUD, showToast, Toast } from "@raycast/api";

export default async function Command() {
  try {
    await open("wattmeter://export-csv?source=raycast");
    await showHUD("Wattmeter export started…");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to start export",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
