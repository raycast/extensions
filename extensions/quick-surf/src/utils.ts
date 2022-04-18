import { Application, getPreferenceValues } from "@raycast/api";
import { ItemType } from "./input";

export interface Preferences {
  engine: string;
  sort: string;
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

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export function isMailTo(text: string): boolean {
  return text.slice(0, 7) == "mailto:" && isEmailGroup(text.slice(7));
}

export function isEmail(text: string): boolean {
  const regex = /^\w+((.\w+)|(-\w+))@[A-Za-z0-9]+((.|-)[A-Za-z0-9]+).[A-Za-z0-9]+$/;
  return regex.test(text);
}

export function isEmailGroup(text: string): boolean {
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

export function mailtoBuilder(emailGroup: string): string {
  const emails = emailGroup.split(";");
  let _emailGroup = "";
  emails.map((value) => {
    if (isEmail(value)) {
      _emailGroup = _emailGroup + value + ";";
    }
  });
  return "mailto:" + _emailGroup;
}

export function isUrl(text: string): boolean {
  const regex = /^(http|https|ftp):\/\/((?:[\w-]+\.)+[a-z0-9]+)((?:\/[^/?#]*)+)?(\?[^#]+)?(#.+)?$/i;
  return regex.test(text) || isIP(text);
}

export function isIP(text: string): boolean {
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
