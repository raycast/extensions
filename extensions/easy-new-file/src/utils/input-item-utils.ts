import { Clipboard, getSelectedText } from "@raycast/api";
import { isEmpty } from "./common-utils";

export const fetchItemInputSelectedFirst = async () => {
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

export const fetchItemInputClipboardFirst = async () => {
  try {
    const clipboardText_ = await Clipboard.readText();
    if (clipboardText_ && !isEmpty(clipboardText_)) {
      return clipboardText_;
    }
  } catch (e) {
    console.error(e);
  }

  let selectedText: string;
  try {
    selectedText = await getSelectedText();
    return selectedText;
  } catch (e) {
    console.error(e);
  }
  return "";
};
