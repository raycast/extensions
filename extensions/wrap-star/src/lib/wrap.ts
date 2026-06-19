import { Clipboard, getSelectedText, showHUD } from "@raycast/api";

/** A delimiter pair the selected text can be wrapped with. */
export interface Wrapper {
  open: string;
  close: string;
  title: string;
  icon: string;
}

export const WRAPPERS = {
  parentheses: { open: "(", close: ")", title: "Parentheses", icon: "icon-parentheses.png" },
  "single-quotes": { open: "'", close: "'", title: "Single Quotes", icon: "icon-single-quotes.png" },
  "double-quotes": { open: '"', close: '"', title: "Double Quotes", icon: "icon-double-quotes.png" },
  "square-brackets": { open: "[", close: "]", title: "Square Brackets", icon: "icon-square-brackets.png" },
  "curly-braces": { open: "{", close: "}", title: "Curly Braces", icon: "icon-curly-braces.png" },
  "angle-brackets": { open: "<", close: ">", title: "Angle Brackets", icon: "icon-angle-brackets.png" },
} satisfies Record<string, Wrapper>;

export type WrapperKey = keyof typeof WRAPPERS;

/**
 * Read the current selection, wrap it with the given pair, and paste it back
 * in place. Shows a HUD on success or when there is nothing to wrap.
 */
export async function wrapSelection(key: WrapperKey): Promise<void> {
  const { open, close } = WRAPPERS[key];

  let selected: string;
  try {
    selected = await getSelectedText();
  } catch {
    await showHUD("No text selected");
    return;
  }

  // Drop any trailing whitespace so "Hello there " wraps as "(Hello there)".
  const trimmed = selected.trimEnd();

  if (!trimmed) {
    await showHUD("No text selected");
    return;
  }

  await Clipboard.paste(`${open}${trimmed}${close}`);
}
