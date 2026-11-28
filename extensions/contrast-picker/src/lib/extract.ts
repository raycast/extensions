import { parseColor } from "./color";

const COLOR_TOKEN =
  /#[0-9a-f]{3,8}\b|(?:rgba?|hsla?|hwb|oklch|oklab|lch|lab|color)\([^)]*\)|\b(?:[a-z0-9-]+:)*(?:text|bg|border|ring|fill|stroke)-[a-z]+(?:-\d{2,3})?(?:\/\d{1,3})?\b/gi;

/**
 * Finds every color in a piece of text, e.g. "#fff on #000" or a copied CSS rule.
 * When the whole text is one color (such as "rebeccapurple" or "A2D26B"), that color is returned.
 */
export function extractColors(text: string | undefined): string[] {
  if (!text) return [];
  if (parseColor(text)) return [text.trim()];
  const tokens = text.match(COLOR_TOKEN) ?? [];
  return tokens.filter((token) => parseColor(token));
}

/**
 * Picks a text color and a background from the given sources, in order of priority.
 * A source that holds two colors fills both fields.
 */
export function resolveColors(sources: (string | undefined)[]): { foreground?: string; background?: string } {
  const found: string[] = [];
  for (const source of sources) {
    for (const color of extractColors(source)) {
      if (found.length < 2) found.push(color);
    }
  }
  return { foreground: found[0], background: found[1] };
}

type Slots = { foreground?: string; background?: string };

/**
 * Reads the text color and the background color from two separate fields and keeps each in its own slot.
 * One field that holds two colors (such as "#fff on #000") fills both slots when the other field is empty.
 */
export function resolveSlots(foreground?: string, background?: string): Slots {
  const fg = extractColors(foreground);
  const bg = extractColors(background);
  if (fg.length > 1 && bg.length === 0) return { foreground: fg[0], background: fg[1] };
  return { foreground: fg[0], background: bg[0] };
}

/**
 * Fills the empty slots from the clipboard colors, oldest first.
 * Both slots empty: the two newest colors. One slot empty: the newest color. A slot you filled is never changed.
 */
export function fillFromClipboard(given: Slots, clipboard: string[]): Slots {
  const newest = clipboard.at(-1);
  if (!given.foreground && !given.background) {
    return clipboard.length > 1
      ? { foreground: clipboard.at(-2), background: newest }
      : { foreground: newest, background: undefined };
  }
  return { foreground: given.foreground ?? newest, background: given.background ?? newest };
}
