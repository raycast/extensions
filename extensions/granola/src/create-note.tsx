import { showToast, Toast, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { toError } from "./utils/errorUtils";

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
    await showFailureToast(toError(error), { title: "Failed to open Granola" });
  }
}
