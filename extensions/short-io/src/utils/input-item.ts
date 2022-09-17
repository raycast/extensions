import { Clipboard, getSelectedText } from "@raycast/api";
import { isEmpty } from "./common-utils";

export const fetchLink = async () => {
  return getSelectedText()
    .then(async (text) => (!isEmpty(text.trim()) && isUrl(text.trim()) ? text.trim() : await getClipboardText()))
    .catch(async () => await getClipboardText())
    .then((item) => (!isEmpty(item.trim()) && isUrl(item.trim()) ? item.trim() : ""))
    .catch(() => "" as string);
};

const getClipboardText = async () => {
  const content = await Clipboard.readText();
  return typeof content == "undefined" ? "" : content;
};

export function isUrl(text: string): boolean {
  const regex = /^(http|https|ftp):\/\/((?:[\w-]+\.)+[a-z\d]+)((?:\/[^/?#]*)+)?(\?[^#]+)?(#.+)?$/i;
  return regex.test(text);
}
