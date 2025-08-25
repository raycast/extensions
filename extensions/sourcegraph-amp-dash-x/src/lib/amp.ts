import { Clipboard } from "@raycast/api";

export async function copyAndPasteAmpCommand(prompt: string): Promise<void> {
  const command = `amp -x "${prompt}"`;
  await Clipboard.copy(command);
  await Clipboard.paste(command);
}
