import { showHUD, Clipboard } from "@raycast/api";
import npmToAll from "npm-to-yarn";

export async function pasteAs(str: "yarn" | "pnpm" | "bun") {
  const clipboardText = (await Clipboard.readText())?.trim();

  if (clipboardText && clipboardText.startsWith("npm")) {
    const converted = npmToAll(clipboardText, str);
    await Clipboard.paste(converted);
    await showHUD(`Converted to ${str}`);
  } else {
    await showHUD("Not a valid npm command");
  }
}
