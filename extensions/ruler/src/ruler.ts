import { Clipboard, Toast, closeMainWindow, showToast } from "@raycast/api";
import { measureDistance } from "swift:../swift/Ruler";

export default async function command() {
  await closeMainWindow();

  try {
    const distance = (await measureDistance()) as unknown as string | undefined;

    if (!distance) {
      return;
    }

    await Clipboard.copy(distance);
    await showToast({ style: Toast.Style.Success, title: "Copied distance to clipboard" });
  } catch (e) {
    await showToast({ style: Toast.Style.Failure, title: "Failed to calculate distance" });
  }
}
