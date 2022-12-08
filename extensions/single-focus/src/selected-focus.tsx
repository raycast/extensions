import { getSelectedText, showToast, Toast } from "@raycast/api";
import { showFocus } from "./utils";
import Style = Toast.Style;

export default async function selectedFocus() {
  try {
    return showFocus({
      text: await getSelectedText(),
    });
  } catch (e) {
    showToast({
      title: "Failed to create focus",
      message: "Cannot copy selected text",
      style: Style.Failure,
    });
  }
}
