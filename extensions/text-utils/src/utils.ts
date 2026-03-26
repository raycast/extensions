import { Clipboard, showHUD, showToast, Toast, getSelectedText } from "@raycast/api";

async function getSelection(): Promise<string> {
  const text = await getSelectedText();
  if (!text) throw new Error("No text selected");
  return text;
}

async function showError(message: string) {
  await showToast({ style: Toast.Style.Failure, title: "Cannot transform text", message });
}

export async function transformSelection(fn: (text: string) => string, hudMessage = "Done") {
  try {
    const text = await getSelection();
    const result = fn(text);
    await Clipboard.paste(result);
    await showHUD(hudMessage);
  } catch (e) {
    await showError(e instanceof Error ? e.message : String(e));
  }
}

export async function countSelection(fn: (text: string) => number, label: string) {
  try {
    const text = await getSelection();
    const count = fn(text);
    await showHUD(`${label}: ${count}`);
  } catch (e) {
    await showError(e instanceof Error ? e.message : String(e));
  }
}

export async function extractSelection(fn: (text: string) => string[], label: string) {
  try {
    const text = await getSelection();
    const results = fn(text);
    if (results.length === 0) {
      await showHUD(`No ${label} found`);
      return;
    }
    await Clipboard.copy(results.join("\n"));
    await showHUD(`${results.length} ${label} copied`);
  } catch (e) {
    await showError(e instanceof Error ? e.message : String(e));
  }
}
