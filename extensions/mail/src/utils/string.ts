import json2md from "json2md";

export const shortenText = (text: string, maxLength: number) => {
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

export const titleCase = (str: string) => {
  str = str
    .toLowerCase()
    .split(" ")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");

  return str.trim();
};

export const formatMarkdown = (title: string, text: string | undefined) => {
  return json2md([{ h1: titleCase(title) }, { p: text }]);
};

export const stripHtmlComments = (html: string) => {
  return html.replace(/<!--[\s\S]*?(?:-->)/g, "");
};
