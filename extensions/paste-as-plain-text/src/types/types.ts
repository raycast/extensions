import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  trimStart: boolean;
  trimEnd: boolean;
  autoFetchTitle: boolean;
  cleanLineBreaks: boolean;
  replaceClipboard: boolean;
  showTips: boolean;
}

export const { trimStart, trimEnd, autoFetchTitle, cleanLineBreaks, replaceClipboard, showTips } =
  getPreferenceValues<Preferences>();

export enum PasteFormat {
  PLAIN_TEXT = "Plain Text",
  JSON = "JSON",
  URL = "URL",
  NUMBER = "Number",
  File = "File",
  MARKDOWN_LINK = "Markdown Link",
  MARKDOWN_IMAGE = "Markdown Image",
}
