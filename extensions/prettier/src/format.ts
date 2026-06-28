import { Clipboard, getPreferenceValues, showHUD, closeMainWindow } from "@raycast/api";
import { homedir } from "os";
import { format, resolveConfig } from "prettier";

const decorateMarkdown = (parser: string, formatted: string) => {
  let codeExt = "jsx";
  switch (parser) {
    case "babel":
    case "flow":
      codeExt = "jsx";
      break;
    case "babel-ts":
    case "typescript":
      codeExt = "ts";
      break;
    case "css":
    case "scss":
    case "less":
      codeExt = "css";
      break;
    case "json":
    case "json5":
    case "json-stringify":
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
    const userOptions = await resolveConfig(homedir());
    const prettier = format(text, { ...userOptions, parser });
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
