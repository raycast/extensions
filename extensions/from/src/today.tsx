import { open, showToast, Toast, closeMainWindow } from "@raycast/api";
import { getTodayNoteId, nodeDeepLink } from "./from-client";

export default async function TodayCommand() {
  try {
    const id = await getTodayNoteId();
    if (!id) throw new Error("Could not get today's note");
    await closeMainWindow();
    await open(nodeDeepLink(id));
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open today's note",
      message: String(e),
    });
  }
}
