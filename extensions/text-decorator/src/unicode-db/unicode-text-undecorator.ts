import db from "./unchardb.json";

export interface UnCharDB {
  [key: string]: string;
}

const unCharDB = db as UnCharDB;

export const undecorate = (decoratedString: string) => {
  let originalString = "";

  [...decoratedString].forEach((char) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const codePoint = char.codePointAt(0).toString(16).toUpperCase();
    originalString += unCharDB[codePoint] || char; // 使用映射找回原始字符，如果找不到则保留当前字符
  });

  return originalString;
};
