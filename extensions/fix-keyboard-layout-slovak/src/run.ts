import { Clipboard, getPreferenceValues, getSelectedText, showHUD } from "@raycast/api";
import { convertDirection, detectDirection, Direction, LayoutId } from "./converter";

const LABELS: Record<Direction, string> = {
  "en-to-sk": "EN → SK",
  "sk-to-en": "SK → EN",
};

async function readSelection(): Promise<string> {
  try {
    return await getSelectedText();
  } catch {
    return "";
  }
}

/** Convert the selected text (or the clipboard) and put the result back. */
export async function run(direction: Direction | "auto") {
  const { slovakLayout, keepNumbers, useClipboard } = getPreferenceValues<Preferences>();
  const slovak: LayoutId = slovakLayout === "qwertz" ? "sk-qwertz" : "sk-qwerty";

  const selected = await readSelection();
  const fromSelection = selected.trim() !== "";
  const text = fromSelection ? selected : useClipboard ? ((await Clipboard.readText()) ?? "") : "";

  if (text.trim() === "") {
    await showHUD(useClipboard ? "No text selected and clipboard is empty" : "No text selected");
    return;
  }

  const resolved = direction === "auto" ? detectDirection(text, slovak) : direction;
  const converted = convertDirection(text, resolved, slovak, { keepNumbers });

  if (fromSelection) {
    await Clipboard.paste(converted);
    await showHUD(`Fixed ${LABELS[resolved]}`);
  } else {
    await Clipboard.copy(converted);
    await showHUD(`Clipboard converted ${LABELS[resolved]}`);
  }
}
