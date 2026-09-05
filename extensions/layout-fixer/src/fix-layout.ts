import { Clipboard, closeMainWindow, getPreferenceValues, getSelectedText, showHUD } from "@raycast/api";
import { setTimeout } from "node:timers/promises";
import { collapseSelection, selectAll } from "./keystrokes";
import { fix, type Variant } from "./layouts";

const LABEL: Record<string, string> = {
  en2ar: "English → عربي",
  ar2en: "عربي → English",
};

/** Raycast's window needs a moment to hand focus back before ⌘A can land. */
const FOCUS_SETTLE_MS = 120;

/**
 * If we selected the field ourselves and got back more than this, focus was
 * almost certainly not in a text field — ⌘A in a browser selects the whole
 * page, in Finder every file. Rewriting that is not what anyone wants, so we
 * stop and ask for an explicit selection instead.
 */
const MAX_FIELD_LENGTH = 5000;

function resolveVariant(): Variant {
  const { layout } = getPreferenceValues<Preferences>();
  if (layout === "mac" || layout === "windows") return layout;
  return process.platform === "darwin" ? "mac" : "windows";
}

/** getSelectedText rejects when there is no selection; treat that as empty. */
async function readSelection(): Promise<string> {
  try {
    return await getSelectedText();
  } catch {
    return "";
  }
}

export default async function Command(): Promise<void> {
  let source = await readSelection();
  let selectedByUs = false;

  // Nothing selected — assume the cursor is sitting in a field and take all
  // of it. Raycast has to be out of the way first for the keystroke to land.
  if (!source.trim()) {
    await closeMainWindow();
    await setTimeout(FOCUS_SETTLE_MS);
    await selectAll();
    selectedByUs = true;
    source = await readSelection();
  }

  async function bail(message: string): Promise<void> {
    if (selectedByUs) await collapseSelection();
    await showHUD(message);
  }

  if (!source.trim()) {
    return bail("Nothing to fix — select some text or click into a text field");
  }

  if (selectedByUs && source.length > MAX_FIELD_LENGTH) {
    return bail("No text field in focus — select the text you want fixed");
  }

  const { direction, text } = fix(source, resolveVariant());

  if (text === source) {
    return bail("Nothing to fix — no wrong-layout text found");
  }

  await Clipboard.paste(text);
  await showHUD(LABEL[direction]);
}
