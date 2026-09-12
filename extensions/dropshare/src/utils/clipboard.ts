import { Clipboard } from "@raycast/api";

export const getUrlFromClipboard = async () => {
  let content = await Clipboard.readText();
  content = typeof content == "undefined" ? "" : content;
  if (isUrl(content)) {
    return content;
  }
  return "";
};

export function isUrl(text: string): boolean {
  return text.startsWith("http://") || text.startsWith("https://");
}
