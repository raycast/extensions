import { getSelectedText } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export enum TextType {
  TEXT = "Text",
  URL = "URL",
  NULL = " ",
}

export interface SearchText {
  type: TextType;
  content: string;
}

const inputText = () =>
  getSelectedText()
    .then((text) => (isNotEmpty(text) ? text : runAppleScript("the clipboard")))
    .catch(() => runAppleScript("the clipboard"))
    .then((text) => (isNotEmpty(text) ? text : ""))
    .catch(() => "");

export async function getInputText(): Promise<SearchText> {
  const text: string = await inputText();
  return setInputText(text);
}

export function setInputText(text: string): SearchText {
  const trimText = text.trim();
  if (isNotEmpty(trimText)) {
    if (isUrl(trimText)) {
      return { type: TextType.URL, content: trimText };
    } else {
      return { type: TextType.TEXT, content: trimText };
    }
  } else {
    return { type: TextType.NULL, content: trimText };
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
