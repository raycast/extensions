import db from "./chardb.json";

export interface CharDB {
  [key: string]: {
    [fontName: string]: string;
  };
}

export interface Option {
  fallback: boolean;
}
const dbTyped = db as CharDB;

export const decorate = (targetString: string, fontName: string, option: Option = { fallback: false }) => {
  let result = "";
  [...targetString].forEach((char) => {
    result += asciiToDecoratedText(char, fontName, option);
  });
  return result;
};

function asciiToDecoratedText(char: string, fontName: string, option: Option) {
  const charUpperCase = char.toUpperCase();

  if (dbTyped[char] === undefined && dbTyped[charUpperCase] === undefined) {
    return char;
  }

  if (dbTyped[char][fontName] === "" && option.fallback) {
    char = char.toUpperCase();
  }

  try {
    return String.fromCodePoint(Number(`0x${dbTyped[char][fontName]}`));
  } catch (e) {
    return char;
  }
}
