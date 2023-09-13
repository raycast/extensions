import { showHUD, Clipboard } from "@raycast/api";
import npmToAll from "npm-to-yarn";

export async function npmTo(to: "yarn" | "pnpm" | "bun") {
  const clipboardText = (await Clipboard.readText())?.trim();

  if (clipboardText && clipboardText.startsWith("npm")) {
    const converted = npmToAll(clipboardText, to);
    await Clipboard.paste(converted);
    await showHUD(`Converted to ${to}`);
  } else {
    await showHUD("Not a valid npm command");
  }
}
