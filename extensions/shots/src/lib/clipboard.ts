import { Clipboard } from "@raycast/api";

export async function copyToClipboard(value: string): Promise<void> {
  await Clipboard.copy(value);
}
