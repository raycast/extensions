import { DataType } from "./types";

export function formatItem(item: DataType, format: string) {
  let formatPattern = format.length ? format : "{title} ({link})";
  for (const key in item) {
    const value = item[key];
    if (value) {
      formatPattern = formatPattern.replaceAll(`{${key}}`, value);
    }
  }

  return formatPattern;
}

export function formatOutput(installedExtensions: DataType[], format: string, separator: string, prepend: string) {
  const joinChar = separator === "newline" ? "\n" : ", ";
  const prependText = prepend.length ? `${prepend}\n` : "";

  return `${prependText.replaceAll("{count}", installedExtensions.length.toString())}${installedExtensions
    .map((item) => {
      return formatItem(item, format);
    })
    .join(joinChar)}`;
}
