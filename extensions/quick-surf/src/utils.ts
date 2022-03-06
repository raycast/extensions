import { getSelectedText } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export enum ItemType {
  TEXT = "Text",
  URL = "URL",
  NULL = " ",
}

export interface ItemInput {
  type: ItemType;
  content: string;
}

const selectedText = () =>
  getSelectedText()
    .then((text) => (isNotEmpty(text) ? text : runAppleScript("the clipboard")))
    .catch(() => runAppleScript("the clipboard"))
    .then((text) => (isNotEmpty(text) ? text : ""))
    .catch(() => "");

export async function fetchSelectedItem(): Promise<ItemInput> {
  const text: string = await selectedText();
  return assembleInputItem(text);
}

export function assembleInputItem(text: string): ItemInput {
  const trimText = text.trim();
  if (isNotEmpty(trimText)) {
    if (isUrl(trimText)) {
      return { type: ItemType.URL, content: trimText };
    } else {
      return { type: ItemType.TEXT, content: trimText };
    }
  } else {
    return { type: ItemType.NULL, content: trimText };
  }
}

function isUrl(url: string): boolean {
  return /^(https?:\/\/(([a-zA-Z0-9]+-?)+[a-zA-Z0-9]+\.)+[a-zA-Z]+)(:\d+)?(\/.*)?(\?.*)?(#.*)?$/.test(url);
}

const isNotEmpty = (string: string | null | undefined) => {
  return string != null && String(string).length > 0;
};

export const urlBuilder = (prefix: string, text: string) => {
  return /^https?:\/\//g.test(text) ? text : `${prefix}${encodeURIComponent(text)}`;
};
