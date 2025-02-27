import { getSelectedText, showToast, Toast } from "@raycast/api";
import { fullScreen } from "./utils";

export default async function Command() {
  let text = "";

  try {
    text = await getSelectedText();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No selected text found",
      message: String(error),
    });
  }

  await fullScreen(text);
}
