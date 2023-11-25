import { isIPv4 } from "net";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export function isMailTo(text: string): boolean {
  return text.slice(0, 7) == "mailto:" && isEmailGroup(text.slice(7));
}

export function isEmail(text: string): boolean {
  const regex = /^\w+((.\w+)|(-\w+))@[A-Za-z\d]+((.|-)[A-Za-z\d]+).[A-Za-z\d]+$/;
  return regex.test(text);
}

const regex = /;|,/;

export function isEmailGroup(text: string): boolean {
  if (isEmpty(text)) {
    return false;
  }
  const emails = text.split(regex);
  let _isEmailGroup = true;
  emails.forEach((value, index) => {
    _isEmailGroup = _isEmailGroup && ((isEmpty(value) && index == emails.length - 1) || isEmail(value));
  });
  return _isEmailGroup;
}

export function mailtoBuilder(emailGroup: string): string {
  const emails = emailGroup.split(regex);
  let _emailGroup = "";
  emails.map((value) => {
    if (isEmail(value)) {
      _emailGroup = _emailGroup + value + ";";
    }
  });
  return "mailto:" + _emailGroup;
}

export function isUrl(text: string): boolean {
  const regex = /^(http|https|ftp):\/\/((?:[\w-]+\.)+[a-z\d]+)((?:\/[^/?#]*)+)?(\?[^#]+)?(#.+)?$/i;
  return regex.test(text) || isIPv4(text);
}

export const urlBuilder = (prefix: string, text: string) => {
  return /^https?:\/\//g.test(text) ? text : `${prefix}${encodeURIComponent(text)}`;
};

export const urlIPBuilder = (prefix: string, text: string) => {
  return /^http:\/\//g.test(text) ? text : `${prefix}${text}`;
};
