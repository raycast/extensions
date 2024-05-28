import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  trimStart: boolean;
  trimEnd: boolean;
  cleanLineBreaks: boolean;
  replaceClipboard: boolean;
}

export const { trimStart, trimEnd, cleanLineBreaks, replaceClipboard } = getPreferenceValues<Preferences>();

export enum PasteFormat {
  PLAIN_TEXT = "Plain Text",
  JSON = "JSON",
  URL = "URL",
  NUMBER = "Number",
  MARKDOWN_LINK = "Markdown Link",
  MARKDOWN_IMAGE = "Markdown Image",
}
