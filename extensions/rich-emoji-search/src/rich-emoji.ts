import emojiCodes from "./emoji.json";
import synonyms from "./keywords.json";

export interface RichEmoji {
  /** The rich emoji name, e.g. `flag_for_united_states`. */
  name: string;
  /** Exactly the character rich stores, byte for byte. */
  character: string;
  /** The character in emoji presentation — what most apps need to draw it in colour. */
  display: string;
  /** Whether `display` differs from `character`, i.e. rich stores the bare codepoint. */
  needsPresentationSelector: boolean;
  /** The rich console markup for the emoji, e.g. `:tada:`. */
  markup: string;
  /** Other rich names that render the same character. */
  aliases: string[];
  /** Extra terms matched by Raycast's search bar in addition to the title. */
  keywords: string[];
  /**
   * For text-presentation characters, an SVG rendering the glyph the way a
   * terminal draws it. `undefined` when the emoji form is already correct.
   */
  terminalPreview?: string;
}

const VARIATION_SELECTOR_16 = "️";
const VARIATION_SELECTOR_15 = "︎";

/**
 * rich stores 170 of its characters as a bare codepoint with no U+FE0F — `ℹ` is
 * just U+2139, `✈` just U+2708. Those codepoints default to *text* presentation,
 * so pasting them yields a thin serif glyph rather than the emoji you picked.
 * Raycast's own renderer forces emoji presentation, which is why the grid looks
 * right while the clipboard doesn't.
 *
 * Appending U+FE0F requests the emoji form. On a codepoint that already defaults
 * to emoji presentation it is a no-op, so this only has to be roughly right:
 * everything rich stores above U+1F000 is already emoji-default and left alone.
 */
function presentationFormOf(character: string): string {
  const codepoints = [...character];
  if (codepoints.length !== 1) {
    return character;
  }
  const codepoint = codepoints[0].codePointAt(0) ?? 0;
  return codepoint < 0x1f000 ? character + VARIATION_SELECTOR_16 : character;
}

/**
 * Draw a character the way a terminal running rich draws it.
 *
 * Handing Raycast a bare character makes it render with the colour emoji font,
 * so `ℹ` shows as a blue tile no matter what string we pass — that is the
 * renderer's choice, not the string's. Wrapping the glyph in an SVG `<text>`
 * element puts it back under font control: U+FE0E requests text presentation and
 * the monospace stack matches a terminal, so the tile previews rich's real
 * output instead of Apple's artwork.
 */
function terminalPreviewOf(character: string): string {
  const glyph = (character + VARIATION_SELECTOR_15).replace(/[&<>]/g, (c) => `&#${c.charCodeAt(0)};`);
  // No `dominant-baseline` (patchily supported outside browsers) and no CSS
  // generic font names — an explicit baseline and real family names are what
  // non-browser SVG rasterizers reliably honour.
  //
  // A monospace glyph sits inside a narrow advance width, so at the same nominal
  // size it draws visibly smaller than the colour emoji in neighbouring tiles.
  // 88 brings the two to about the same optical size; the baseline follows it,
  // since centring a cap-height of ~0.7em means y = 50 + 0.35 × font-size.
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">`,
    `<text x="50" y="81" text-anchor="middle"`,
    ` font-family="Menlo, Apple Symbols, monospace" font-size="88">${glyph}</text>`,
    `</svg>`,
  ].join("");
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * rich names are lowercase and separated by underscores, but they also contain
 * hyphens, parentheses and ampersands (`ab_button_(blood_type)`,
 * `antigua_&_barbuda`, `medium-dark_skin_tone`). Splitting on everything that
 * isn't alphanumeric makes every word of a name searchable, not just the first,
 * while keeping the full name so `flag_for` still matches too.
 *
 * The name alone is not enough to find things, though: `flag_for_united_states`
 * contains no "US" and `grinning_face` no "happy". `keywords.json` supplies
 * those synonyms per character — see scripts/build-keywords.py.
 */
function keywordsFor(name: string, character: string): string[] {
  const words = name.split(/[^a-z0-9]+/i).filter(Boolean);
  const extra = synonymsByCharacter[character] ?? [];
  return [...new Set([name, ...words, ...extra])];
}

const codes = emojiCodes as Record<string, string>;
const synonymsByCharacter = synonyms as Record<string, string[]>;

const namesByCharacter = new Map<string, string[]>();
for (const [name, character] of Object.entries(codes)) {
  const names = namesByCharacter.get(character);
  if (names) {
    names.push(name);
  } else {
    namesByCharacter.set(character, [name]);
  }
}

/**
 * Every emoji rich exposes, in the order it ships them.
 *
 * Names are intentionally *not* deduplicated by character: in rich the name is
 * the payload, so `:thumbs_down:` and `:-1:` are two results worth having even
 * though both render 👎.
 */
export const richEmojis: RichEmoji[] = Object.entries(codes).map(([name, character]) => {
  const display = presentationFormOf(character);
  return {
    name,
    character,
    display,
    needsPresentationSelector: display !== character,
    markup: `:${name}:`,
    aliases: (namesByCharacter.get(character) ?? []).filter((alias) => alias !== name),
    keywords: keywordsFor(name, character),
    terminalPreview: display === character ? undefined : terminalPreviewOf(character),
  };
});
