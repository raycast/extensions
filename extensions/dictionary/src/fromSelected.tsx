import { getSelectedText, launchCommand, LaunchType, showHUD } from "@raycast/api";

export default async function Command() {
  try {
    const selectedText = await getSelectedText();
    await launchCommand({
      name: "fromCmd",
      type: LaunchType.UserInitiated,
      context: { selectedText },
    });
  } catch (error) {
    await showHUD(`Cannot get selected text: ${error instanceof Error ? error.message : String(error)}`);
  }
}
