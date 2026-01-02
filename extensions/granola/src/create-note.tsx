import { showToast, Toast, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export default async function Command() {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Opening Granola",
    });

    await open("granola://new-document?creation_source=raycast");

    await showToast({
      style: Toast.Style.Success,
      title: "Opened new note in Granola",
    });
  } catch (error) {
    await showFailureToast({ title: "Failed to open Granola", message: String(error) });
  }
}
