import { strip, replace } from "clean-text-utils";
import json2md from "json2md";

export const shortenText = (text: string, maxLength: number): string => {
  let length = text
    .split("")
    .map((c: string) => (c == c.toUpperCase() ? 1.2 : 1))
    .reduce((a: number, b: number) => a + b, 0);

  if (length > maxLength) {
    let shortened = "";
    length = 0;

    for (const c of text) {
      shortened += c;
      length += c == c.toUpperCase() ? 1.2 : 1;
      if (length > maxLength) break;
    }

    return shortened + "...";
  }

  return text;
};

export const titleCase = (str: string): string => {
  str = str
    .toLowerCase()
    .split(" ")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");

  return str.trim();
};

export const formatMarkdown = (title: string, text: string | undefined): string => {
  title = titleCase(title);
  if (text) {
    text = strip.nonASCII(text);
    text = replace.diacritics(text);
    text = replace.exoticChars(text);
    text = replace.smartChars(text);
    text = text.trim().replaceAll(/[ ][ ]+/g, " ");
  }

  return json2md([{ h1: title }, { p: text }]);
};
