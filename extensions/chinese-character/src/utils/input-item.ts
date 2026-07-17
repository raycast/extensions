import { Clipboard, getSelectedText } from "@raycast/api";
import { isEmpty } from "./common-utils";

export const fetchInputItem = async () => {
  try {
    const selectedText = await getSelectedText();
    if (!isEmpty(selectedText)) {
      return selectedText;
    }
  } catch (e) {
    console.error(e);
  }

  try {
    const clipboardText = await Clipboard.readText();
    if (clipboardText) {
      return clipboardText;
    }
  } catch (e) {
    console.error(e);
  }
  return "";
};
