import process from "node:process";
import { ExtensionMetadata } from "./types";

export const isWindows = process.platform === "win32";

export function formatItem(item: ExtensionMetadata, format?: string) {
  const formatPattern = format || "{title} ({link})";

  return formatPattern
    .replaceAll("{title}", item.title)
    .replaceAll("{link}", item.link)
    .replaceAll("{author}", item.author);
}

export function formatOutput(
  installedExtensions: ExtensionMetadata[],
  format?: string,
  separator?: string,
  prepend?: string,
) {
  const joinChar = separator === "newline" ? "\n" : ", ";
  const prependText = prepend ? `${prepend}\n` : "";

  return (
    prependText.replaceAll("{count}", installedExtensions.length.toString()) +
    installedExtensions.map((item) => formatItem(item, format)).join(joinChar)
  );
}
