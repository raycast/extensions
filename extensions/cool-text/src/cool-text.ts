import { Clipboard, showHUD } from "@raycast/api";
import { renderCoolText } from "./render";

export default async function copyQuickText({
  text = "",
  variant,
  font,
}: {
  text?: string;
  variant?: string;
  font?: string;
}) {
  if (!text.trim()) {
    await showHUD("Enter some text to copy");
    return;
  }

  let output: string;
  try {
    output = await renderCoolText(text, variant || "alphabet", font || undefined);
  } catch (error) {
    await showHUD(error instanceof Error ? error.message : "Could not transform text");
    return;
  }

  try {
    await Clipboard.copy(output);
  } catch {
    await showHUD("Could not copy text. Please try again.");
    return;
  }
  await showHUD("CoolText copied");
}
