import { cleanInput } from "./input.ts";

export async function readClipboardText(
  read: () => Promise<{ text?: string; file?: string }>,
): Promise<string | undefined> {
  try {
    const content = await read();
    if (
      !content.file &&
      typeof content.text === "string" &&
      cleanInput(content.text)
    )
      return cleanInput(content.text);
  } catch {
    // An unavailable clipboard falls back to manual input.
  }
}

export async function readInputText(
  readSelection: () => Promise<string>,
  readClipboard: () => Promise<{ text?: string; file?: string }>,
): Promise<{ text: string; source: "selection" | "clipboard" } | undefined> {
  try {
    const text = await readSelection();
    if (typeof text === "string" && cleanInput(text))
      return { text: cleanInput(text), source: "selection" };
  } catch {
    // Some apps cannot expose their selection; try the clipboard next.
  }
  const text = await readClipboardText(readClipboard);
  if (text) return { text, source: "clipboard" };
}

export type TranslationContext = {
  requestId: string;
  input?: { text: string; source: "selection" | "clipboard" };
};

export async function createTranslationContext(
  readSelection: () => Promise<string>,
  readClipboard: () => Promise<{ text?: string; file?: string }>,
): Promise<TranslationContext> {
  return {
    requestId: crypto.randomUUID(),
    input: await readInputText(readSelection, readClipboard),
  };
}
