import { Clipboard, getPreferenceValues, showHUD, closeMainWindow } from "@raycast/api";
import { format } from "prettier";
import { Preferences } from "./types";

const decorateMarkdown = (parser: string, formatted: string) => {
  let codeExt = "jsx";
  switch (parser) {
    case "babel" || "flow":
      codeExt = "jsx";
      break;
    case "typescript" || "babel-ts":
      codeExt = "ts";
      break;
    case "css" || "scss" || "less":
      codeExt = "css";
      break;
    case "json" || "json5" || "json-stringify":
      codeExt = "json";
      break;
    case "html":
      codeExt = "html";
      break;
  }

  return "```" + codeExt + "\n" + formatted + "```\n";
};

export default async (expectedFormat: string, parser: string) => {
  const { formatAsMarkdownCodeBlock, copyImmediately, pasteImmediately } = getPreferenceValues<Preferences>();

  const text = await Clipboard.readText();
  if (!text) {
    await showHUD("The Clipboard is empty.");
    return;
  }

  try {
    const prettier = format(text, { semi: false, parser });
    const formatted = formatAsMarkdownCodeBlock ? decorateMarkdown(parser, prettier) : prettier;

    if (copyImmediately) {
      await Clipboard.copy(formatted);
    }

    if (pasteImmediately) {
      await Clipboard.paste(formatted);
    } else {
      await closeMainWindow();
    }
  } catch (error) {
    await showHUD(`There was an error while formatting ${expectedFormat} using parser: "${parser}.`);
  }
};
