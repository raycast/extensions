import { Icon } from "@raycast/api";

/**
 * Resolve a built-in icon by trying member names in order, returning the first
 * one that exists in the `Icon` enum provided at runtime.
 *
 * Raycast and Vicinae expose slightly different `Icon` members for the same
 * glyph (e.g. Raycast `Globe` vs Vicinae `Globe01`). Since both launchers share
 * this source and resolve `@raycast/api` at runtime, referencing a name that
 * only exists on one of them yields `undefined` and renders no icon. Listing the
 * Raycast name first and the Vicinae name as a fallback keeps icons working on
 * both.
 */
const resolveIcon = (...names: string[]): Icon => {
  for (const name of names) {
    const value = (Icon as Record<string, Icon>)[name];
    if (value) return value;
  }
  return Icon.Circle;
};

export const Icons = {
  Document: resolveIcon("Document", "BlankDocument"),
  Shield: resolveIcon("Shield", "Shield01"),
  Clipboard: resolveIcon("Clipboard", "CopyClipboard"),
  Globe: resolveIcon("Globe", "Globe01"),
};
