import { Clipboard, getSelectedText } from "@raycast/api";

export const fetchItemInput = async () => {
  return getSelectedText()
    .then(async (text) => (!isEmpty(text) ? text : await getClipboardText()))
    .catch(async () => await getClipboardText())
    .then((item) => (!isEmpty(item) ? item : ""))
    .catch(() => "" as string);
};

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

const getClipboardText = async () => {
  const content = await Clipboard.readText();
  return typeof content == "undefined" ? "" : content;
};
