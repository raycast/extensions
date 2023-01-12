import { Application, getPreferenceValues, getSelectedText, Clipboard } from "@raycast/api";

export interface Preferences {
  engine: string;
  sort: string;
}

export enum ItemType {
  TEXT = "Text",
  URL = "URL",
  EMAIL = "Email",
  NULL = "",
}

export enum ItemSource {
  SELECTED = "Selected",
  CLIPBOARD = "Clipboard",
  ENTER = "Enter",
  NULL = "",
}

export interface ItemInput {
  type: ItemType;
  source: ItemSource;
  content: string;
}

export class SurfApplication implements Application {
  bundleId?: string;
  name: string;
  path: string;
  add: boolean;
  suggest: boolean;
  rankText: number;
  rankURL: number;
  rankEmail: number;
  support: ItemType[];

  constructor(
    name: string,
    path: string,
    add: boolean,
    suggest: boolean,
    rankText: number,
    rankURL: number,
    rankEmail: number,
    support: ItemType[],
    bundleId?: string
  ) {
    this.bundleId = bundleId;
    this.name = name;
    this.path = path;
    this.add = add;
    this.suggest = suggest;
    this.rankText = rankText;
    this.rankURL = rankURL;
    this.rankEmail = rankEmail;
    this.support = support;
  }
}

export const preferences = () => {
  const preferencesMap = new Map(Object.entries(getPreferenceValues<Preferences>()));
  return { engine: preferencesMap.get("SurfEngine"), sort: preferencesMap.get("SortBy") };
};

const detectText = () => {
  return getSelectedText()
    .then(async (text) =>
      !isEmpty(text)
        ? assembleItemSource(text.substring(0, 999), ItemSource.SELECTED)
        : assembleItemSource(String(await clipboard()), ItemSource.CLIPBOARD)
    )
    .catch(async () => assembleItemSource(String(await clipboard()), ItemSource.CLIPBOARD))
    .then((item) =>
      !isEmpty(item.content)
        ? assembleItemSource(item.content.substring(0, 999), item.source)
        : assembleItemSource("", ItemSource.NULL)
    )
    .catch(() => assembleItemSource("", ItemSource.NULL));
};

const clipboard = async () => {
  const content = await Clipboard.readText();
  return typeof content == "undefined" ? "" : content;
};

export async function fetchDetectedItem(): Promise<ItemInput> {
  const item = await detectText();
  return assembleItemType(item);
}

export function assembleItemSource(text: string, source: ItemSource): ItemInput {
  return { type: ItemType.NULL, source: source, content: text };
}
export function assembleItemType(item: ItemInput): ItemInput {
  const trimText = item.content.trim();
  if (isEmpty(trimText)) {
    return { type: ItemType.NULL, source: ItemSource.NULL, content: trimText };
  } else {
    if (isMailTo(trimText)) {
      return { type: ItemType.EMAIL, source: item.source, content: mailtoBuilder(trimText.slice(7)) };
    } else if (isEmailGroup(trimText)) {
      return { type: ItemType.EMAIL, source: item.source, content: mailtoBuilder(trimText) };
    } else if (isUrl(trimText)) {
      let url;
      if (isIP(trimText)) {
        if (trimText == "127.0.0.1") {
          url = "http://www." + trimText;
        } else {
          url = urlIPBuilder("http://", trimText);
        }
      } else {
        url = /^https?:\/\//g.test(trimText) ? trimText : "https://" + trimText;
      }
      return { type: ItemType.URL, source: item.source, content: url };
    } else {
      return { type: ItemType.TEXT, source: item.source, content: trimText };
    }
  }
}

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

function isMailTo(text: string): boolean {
  return text.slice(0, 7) == "mailto:" && isEmailGroup(text.slice(7));
}

function isEmail(text: string): boolean {
  return /^([a-zA-Z0-9]+[_|.]?)*[a-zA-Z0-9]+@([a-zA-Z0-9]+[_|.]?)*[a-zA-Z0-9]+\.[a-zA-Z]{2,3}$/.test(text);
}

function isEmailGroup(text: string): boolean {
  if (isEmpty(text)) {
    return false;
  }
  const emails = text.split(";");
  let _isEmailGroup = true;
  emails.forEach((value, index) => {
    _isEmailGroup = _isEmailGroup && ((isEmpty(value) && index == emails.length - 1) || isEmail(value));
  });
  return _isEmailGroup;
}

function mailtoBuilder(emailGroup: string): string {
  const emails = emailGroup.split(";");
  let _emailGroup = "";
  emails.map((value) => {
    if (isEmail(value)) {
      _emailGroup = _emailGroup + value + ";";
    }
  });
  return "mailto:" + _emailGroup;
}

function isUrl(text: string): boolean {
  return (
    /^((https?:\/\/)?(([a-zA-Z0-9]+-?)+[a-zA-Z0-9]+\.)+[a-zA-Z]+)(:\d+)?(\/.*)?(\?.*)?(#.*)?$/.test(text) || isIP(text)
  );
}

function isIP(text: string): boolean {
  return /^(http:\/\/)?(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])$/.test(
    text
  );
}

export const urlBuilder = (prefix: string, text: string) => {
  return /^https?:\/\//g.test(text) ? text : `${prefix}${encodeURIComponent(text)}`;
};

export const urlIPBuilder = (prefix: string, text: string) => {
  return /^http:\/\//g.test(text) ? text : `${prefix}${text}`;
};
