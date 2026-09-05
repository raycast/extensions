import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";

export async function readClipboardText(): Promise<string | null> {
  const text = await Clipboard.readText();
  if (!text || text.length === 0) {
    await showToast({ style: Toast.Style.Failure, title: "Clipboard is empty" });
    return null;
  }
  return text;
}

export async function pasteResult(text: string, hud: string): Promise<void> {
  await Clipboard.paste(text);
  await showHUD(hud);
}

export async function copyResult(text: string, hud: string): Promise<void> {
  await Clipboard.copy(text);
  await showHUD(hud);
}
