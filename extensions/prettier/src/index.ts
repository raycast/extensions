import { showHUD, Clipboard, getPreferenceValues } from "@raycast/api";
import { format } from "prettier";

interface Preferences {
  parser: string;
}

export default async function main() {
  const preferences = getPreferenceValues<Preferences>();

  const text = await Clipboard.readText();
  if (!text) {
    await showHUD("No Clipboard content");
    return;
  }

  try {
    const formatted = format(text, { semi: false, parser: preferences.parser });

    let codeExt = "jsx";
    switch (preferences.parser) {
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
    const markdown = "```" + codeExt + "\n" + formatted + "```\n";
    await Clipboard.copy(markdown);
    await Clipboard.paste(markdown);
  } catch (error) {
    await showHUD("Sorry, something went wrong. Please make sure the clipboard contains supported code by parser.");
  }
}
