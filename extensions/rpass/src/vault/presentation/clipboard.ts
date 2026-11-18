import { Clipboard, getPreferenceValues, showHUD } from "@raycast/api";

function timeoutSeconds(): number {
  const { clipboardTimeout } = getPreferenceValues<Preferences>();
  return parseInt(clipboardTimeout, 10) || 0;
}

async function clearIfUnchanged(expected: string): Promise<void> {
  const current = await Clipboard.readText();
  if (current === expected) {
    await Clipboard.clear();
  }
}

function scheduleClear(content: string): void {
  const seconds = timeoutSeconds();
  if (seconds <= 0) return;
  setTimeout(() => clearIfUnchanged(content), seconds * 1000);
}

export async function copyPassword(content: string): Promise<void> {
  await Clipboard.copy(content, { concealed: true });
  scheduleClear(content);
  await showHUD("Copied to Clipboard", { clearRootSearch: true });
}

export async function pastePassword(content: string): Promise<void> {
  await Clipboard.paste(content);
  scheduleClear(content);
  await showHUD("Pasted in Active App", { clearRootSearch: true });
}
