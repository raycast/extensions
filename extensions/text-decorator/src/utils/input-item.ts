import { Clipboard, getSelectedText } from "@raycast/api";
import { isEmpty } from "./common-utils";

export const fetchInputItem = async () => {
  return getSelectedText()
    .then(async (text) => (!isEmpty(text) ? text : await getClipboardText()))
    .catch(async () => await getClipboardText())
    .then((item) => (!isEmpty(item) ? item : ""))
    .catch(() => "" as string);
};

const getClipboardText = async () => {
  const content = await Clipboard.readText();
  return typeof content == "undefined" ? "" : content;
};
