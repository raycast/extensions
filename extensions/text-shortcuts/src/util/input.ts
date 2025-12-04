import { Clipboard, getSelectedText } from "@raycast/api";
import { isEmpty } from "./utils";

export const fetchItemInput = async () => {
  return await fetchItemInputSelectedFirst();
};

export const fetchItemInputSelectedFirst = async () => {
  return getSelectedText()
    .then(async (text) => (!isEmpty(text) ? text : await getClipboardText()))
    .catch(async () => await getClipboardText())
    .then((item) => (!isEmpty(item) ? item : ""))
    .catch(() => "" as string);
};

export const fetchItemInputClipboardFirst = async () => {
  return getClipboardText()
    .then(async (text) => (!isEmpty(text) ? text : await getSelectedText()))
    .catch(async () => await getSelectedText())
    .then((item) => (!isEmpty(item) ? item : ""))
    .catch(() => "" as string);
};

const getClipboardText = async () => {
  const content = await Clipboard.readText();
  return typeof content == "undefined" ? "" : content;
};
