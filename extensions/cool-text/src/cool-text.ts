import { Clipboard, showHUD, type LaunchProps } from "@raycast/api";
import { renderCoolText } from "./render";

export default async function Command(props: LaunchProps<{ arguments: Arguments.CoolText }>) {
  const { text, variant, font } = props.arguments;
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
