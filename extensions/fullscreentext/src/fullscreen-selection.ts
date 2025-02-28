import { getSelectedText } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { fullScreen } from "./utils";

export default async function Command() {
  let text = "";

  try {
    text = await getSelectedText();
  } catch (error) {
    await showFailureToast(error, { title: "No selected text found" });
  }

  await fullScreen(text);
}
