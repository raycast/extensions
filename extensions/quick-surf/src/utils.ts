import { Application, getPreferenceValues, getSelectedText } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export interface Preferences {
  engine: string;
  sort: string;
}

export enum ItemType {
  TEXT = "Text",
  URL = "URL",
  NULL = " ",
}

export interface ItemInput {
  type: ItemType;
  content: string;
}

export class SurfApplication implements Application {
  name = "";
  path = "";
  add: boolean;
  suggest: boolean;
  rankText: number;
  rankURL: number;

  bundleId?: string;
  constructor(
    name: string,
    path: string,
    add: boolean,
    suggest: boolean,
    rankText: number,
    rankURL: number,
    bundleId?: string
  ) {
    this.bundleId = bundleId;
    this.name = name;
    this.path = path;
    this.add = add;
    this.suggest = suggest;
    this.rankText = rankText;
    this.rankURL = rankURL;
  }
}

export const preferences = () => {
  const preferencesMap = new Map(Object.entries(getPreferenceValues<Preferences>()));
  return { engine: preferencesMap.get("SurfEngine"), sort: preferencesMap.get("SortBy") };
};

const selectedText = () =>
  getSelectedText()
    .then((text) => (isNotEmpty(text) ? text.substring(0, 8000) : runAppleScript("the clipboard")))
    .catch(() => runAppleScript("the clipboard"))
    .then((text) => (isNotEmpty(text) ? text.substring(0, 8000) : ""))
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
