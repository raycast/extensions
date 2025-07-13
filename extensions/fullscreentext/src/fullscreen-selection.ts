import { getSelectedText, closeMainWindow } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { fullScreen } from "swift:../swift/fullscreen";

export default async function Command() {
  let text = "";

  try {
    text = await getSelectedText();
  } catch (error) {
    await showFailureToast(error, { title: "No selected text found" });
  }

  closeMainWindow({ clearRootSearch: true });
  await fullScreen(text);
}
