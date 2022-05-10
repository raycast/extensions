import { isEmpty } from "./common-utils";

//single char
export const buildUnicode = (char: string) => {
  const _u = char.charCodeAt(0).toString(16);
  const affixLength = 4 - _u.length;
  const affix = "0".repeat(affixLength);
  return affix + _u;
};

//single unicode
export const unicodeToNative = (unicode: string) => {
  return String.fromCharCode(parseInt(unicode, 16));
};

//unicodes
export const unicodesToNative = (unicodes: string) => {
  if (isEmpty(unicodes.trim())) return "";
  let _native = "";
  unicodes
    .trim()
    .split("\\u")
    .forEach((value) => {
      if (isEmpty(value)) return;
      _native += unicodeToNative(value);
    });
  return _native;
};

//utf-8 unicode
export const chineseUtf8ToNative = (utf8: string) => {
  if (isEmpty(utf8.trim())) return "";
  let _native = "";
  utf8
    .trim()
    .replaceAll(";", "")
    .split("&#x")
    .forEach((value) => {
      if (isEmpty(value)) return;
      _native += unicodeToNative(value);
    });
  return _native;
};
