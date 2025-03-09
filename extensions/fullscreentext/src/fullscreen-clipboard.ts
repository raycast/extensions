import { Clipboard, closeMainWindow, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { fullScreen } from "swift:../swift/fullscreen";

export default async function Command() {
  let text;

  try {
    text = await Clipboard.readText();
  } catch (error) {
    await showFailureToast(error, { title: "No text found in clipboard" });
  }

  if (!text || text.includes("Image")) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No text found in clipboard",
    });
    return;
  }

  closeMainWindow({ clearRootSearch: true });
  await fullScreen(text);
}
