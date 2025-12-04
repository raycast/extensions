import dateFormat from "dateformat";
import { ApiPasteFormat, ParsedPaste, Publicity } from "pastebin-api";
import { Icon } from "@raycast/api";

const publicityIcons: Record<Publicity, { value: Icon; tooltip: string }> = {
  [Publicity.Public]: {
    value: Icon.Globe,
    tooltip: "Public",
  },
  [Publicity.Private]: {
    value: Icon.Link,
    tooltip: "Private",
  },
  [Publicity.Unlisted]: {
    value: Icon.EyeSlash,
    tooltip: "Unlisted",
  },
};

const languageNameFixes: Partial<Record<ApiPasteFormat, string>> = {
  cpp: "cplusplus",
  css: "css3",
};

export function getPublicityIcon(publicity: Publicity) {
  return publicityIcons[publicity];
}

export function formatPaste(paste: ParsedPaste, content: string) {
  return `\`\`\`${paste.paste_format_short}\n${content}\n\`\`\``;
}

export function formatDate(date: Date) {
  return dateFormat(date);
}

export function getProgrammingLanguageIcon(format: ApiPasteFormat) {
  const name = languageNameFixes[format] || format;
  return `https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${name}/${name}-original.svg`;
}
