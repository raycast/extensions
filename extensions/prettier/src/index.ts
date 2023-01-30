import { showHUD, Clipboard } from "@raycast/api";
import { format } from "prettier";

export default async function main() {
  const text = await Clipboard.readText();
  if (!text) {
    await showHUD("No Clipboard content");
    return;
  }

  const formatted = format(text, { semi: false, parser: "babel" });
  const markdown = "```jsx\n" + formatted + "```\n";
  await Clipboard.copy(markdown);
  await Clipboard.paste(markdown);
  await showHUD("Pasted to cursor");
}
