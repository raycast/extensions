import { ThemeColor, ThemeData } from "../types";
import { toHex } from "./colorUtils";
import { LIMITS, TIMEOUTS } from "./config";
import { getLogger } from "./logger";
import { fetchPageSuppliedUrl } from "./networkGuard";
import { redactUrlForLog } from "./urlUtils";

const log = getLogger("theme");

/**
 * Theme signals a page declares in its own markup.
 *
 * Everything here comes from the HTML already streamed for the dig — no extra
 * request. That bounds what can be found, and the bound is worth stating: CSS
 * custom properties set by JavaScript at runtime are NOT visible. muse.ai's
 * `style="--chat-user-text: #111112; …"` is written onto <html> after hydration,
 * so it exists in a browser's inspector and not in the bytes the server sent.
 * What a server does send is meta theme-color, color-scheme, the vendor tile
 * colours, and whatever <html> attributes and head <style> rules carry.
 */

/**
 * Both quantifiers are BOUNDED.
 *
 * `(--[\w-]+)\s*:\s*([^;}]+)` is quadratic on a long run of hyphens with no
 * colon: every position starts a candidate property and then rescans the
 * suffix. Measured at 158ms / 633ms / 2,519ms for 10k / 20k / 40k hyphens, and
 * the streamed-HTML budget allows far more than that — a page could stall the
 * dig with a <style> block alone. No real custom property approaches these
 * lengths.
 */
const CUSTOM_PROPERTY = /(--[\w-]{1,128})\s*:\s*([^;}]{1,512})/g;

/** Attributes that conventionally carry a theme choice rather than app state. */
const THEME_ATTRIBUTES = /^data-(theme|color-scheme|colour-scheme|mode|accent-color|accent|style|appearance)$/i;

/** Class tokens that name a colour scheme outright. */
const SCHEME_CLASSES = new Set(["light", "dark", "light-theme", "dark-theme", "theme-light", "theme-dark"]);

/**
 * A value worth keeping as a colour token.
 *
 * `toHex` answers for every concrete syntax. A `var()` reference is kept too —
 * it IS a colour, just an indirect one, and dropping it here would silently lose
 * every Tailwind v3 token, which are all written `hsl(var(--x))`.
 */
function isColor(value: string): boolean {
  return toHex(value) !== undefined || COLOR_REFERENCE.test(value) || CHANNELS.test(value);
}

/**
 * A bare channel list — `254 242 242`, `0 86% 97%`, `0, 86%, 97%`.
 *
 * Not a colour by itself, which is why it must NOT be emitted as a token, but it
 * is what `hsl(var(--x))` and `rgb(var(--x))` expand to, so it has to survive
 * collection or every Tailwind v3 palette token resolves to nothing.
 */
const CHANNELS = /^\s*-?[\d.]+%?[\s,]+-?[\d.]+%?[\s,]+-?[\d.]+%?\s*$/;

/**
 * A declaration that is ONLY a colour reference: `var(--x)`, or a colour
 * function wrapping one. Deliberately strict — the loose test "contains a
 * `var()`" also matches every shadow, gradient and filter a framework defines.
 */
const COLOR_REFERENCE =
  /^(?:var\(\s*--[\w-]+\s*(?:,[^()]*)?\)|(?:hsla?|rgba?|oklch|oklab|lab|lch|color)\(\s*var\(\s*--[\w-]+\s*(?:,[^()]*)?\)\s*\))$/i;

/** Normalises for display without altering meaning: collapse space, trim quotes. */
function tidy(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["']|["']$/g, "");
}

/** `name = "x"` and `name=x` are both valid HTML; neither used to match. */
function attributeValue(tag: string, attribute: string): string | undefined {
  const pattern = new RegExp(`\\b${attribute}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i");
  const match = pattern.exec(tag);
  if (!match) return undefined;
  const value = match[1] ?? match[2] ?? match[3];
  return value === undefined ? undefined : tidy(value);
}

function metaTags(html: string, name: string): string[] {
  const tags: string[] = [];
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (attributeValue(tag, "name")?.toLowerCase() === name.toLowerCase()) tags.push(tag);
  }
  return tags;
}

function metaContent(html: string, name: string): string | undefined {
  const tag = metaTags(html, name)[0];
  return tag ? attributeValue(tag, "content") : undefined;
}

/**
 * `theme-color` may appear several times, each scoped to a media query, which is
 * how a site declares a different browser-chrome colour for light and dark. A
 * single value would report one of them as though it were the only one.
 */
function themeColors(html: string): ThemeColor[] {
  const colors: ThemeColor[] = [];
  for (const tag of metaTags(html, "theme-color")) {
    const content = attributeValue(tag, "content");
    if (!content) continue;
    colors.push({ value: content, media: attributeValue(tag, "media") });
  }
  return colors;
}

/** Theme-ish attributes and scheme classes from the opening <html> tag. */
function htmlAttributes(html: string): { attributes: Record<string, string>; schemeClass?: string } {
  const tag = /<html[^>]*>/i.exec(html)?.[0];
  if (!tag) return { attributes: {} };

  const attributes: Record<string, string> = {};
  for (const [, name, value] of tag.matchAll(/\s(data-[\w-]{1,64})\s*=\s*["']([^"']*)["']/gi)) {
    // A build id or trace id is not a theme signal; it just happens to be a
    // data attribute on the same element.
    if (THEME_ATTRIBUTES.test(name) && value.trim() !== "") {
      attributes[name] = tidy(value);
    }
  }

  const className = attributeValue(tag, "class") ?? "";
  const schemeClass = className.split(/\s+/).find((token) => SCHEME_CLASSES.has(token.toLowerCase()));

  return { attributes, schemeClass };
}

/**
 * Custom properties whose value is a colour, taken from <style> blocks present
 * in the markup. First definition wins — later ones are usually the same token
 * redefined under a media query or a `[data-theme]` selector, and reporting each
 * override as a separate token turns a five-colour palette into fifty rows.
 */
function colorTokens(html: string, tag: string | undefined): ThemeColor[] {
  const tokens = new Map<string, string>();
  for (const [, css] of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    for (const [, name, rawValue] of css.matchAll(CUSTOM_PROPERTY)) {
      const value = tidy(rawValue);
      if (!tokens.has(name) && isColor(value)) tokens.set(name, value);
    }
  }
  // An inline style attribute on <html> is where a runtime theme lands when the
  // server renders it — rare, but it is exactly the shape muse.ai uses.
  const htmlStyle = tag ? attributeValue(tag, "style") : undefined;
  if (htmlStyle) {
    for (const [, name, rawValue] of htmlStyle.matchAll(CUSTOM_PROPERTY)) {
      const value = tidy(rawValue);
      if (!tokens.has(name) && isColor(value)) tokens.set(name, value);
    }
  }
  return [...tokens].map(([name, value]) => ({ name, value, hex: toHex(value), source: "markup" as const }));
}

/**
 * Extracts every theme signal from already-fetched HTML.
 *
 * Returns undefined when the page declares nothing — which is the common case,
 * and is a real answer rather than a failure: the section can say the page
 * declares no theme, because the markup was read and contained none.
 */
export function extractThemeData(html: string): ThemeData | undefined {
  const colors = themeColors(html);
  const { attributes, schemeClass } = htmlAttributes(html);
  const tokens = colorTokens(html, /<html\b[^>]*>/i.exec(html)?.[0]);

  const colorScheme = metaContent(html, "color-scheme");
  const tileColor = metaContent(html, "msapplication-TileColor");
  const navButtonColor = metaContent(html, "msapplication-navbutton-color");
  const statusBarStyle = metaContent(html, "apple-mobile-web-app-status-bar-style");

  const vendor: ThemeColor[] = [];
  if (tileColor) vendor.push({ name: "msapplication-TileColor", value: tileColor });
  if (navButtonColor) vendor.push({ name: "msapplication-navbutton-color", value: navButtonColor });

  const empty =
    colors.length === 0 &&
    tokens.length === 0 &&
    vendor.length === 0 &&
    Object.keys(attributes).length === 0 &&
    !colorScheme &&
    !schemeClass &&
    !statusBarStyle;

  if (empty) return undefined;

  return {
    themeColors: colors,
    colorScheme,
    schemeClass,
    statusBarStyle,
    attributes,
    vendorColors: vendor,
    tokens,
  };
}

/**
 * A placeholder, not a colour choice.
 *
 * Tailwind seeds `--tw-gradient-from: #0000` and friends as "unset" sentinels;
 * they are plumbing, and 306 of tailwindcss.com's tokens are this shape. Filtering
 * by VALUE rather than by name keeps the rule honest — a real transparent token is
 * indistinguishable from a sentinel, and neither tells you anything about a palette.
 */
function isPlaceholder(value: string): boolean {
  const v = value.trim().toLowerCase();
  return (
    v === "transparent" ||
    v === "#0000" ||
    v === "#00000000" ||
    /^rgba?\(\s*0[\s,]+0[\s,]+0[\s,/]+0(\.0+)?\s*\)$/.test(v)
  );
}

/** Colour-valued custom properties from a stylesheet body. First definition wins. */
export function extractTokensFromCss(css: string, into: Map<string, string[]>, maxTokens?: number): void {
  const cap = maxTokens ?? LIMITS.MAX_THEME_TOKENS;
  for (const [, name, rawValue] of css.matchAll(CUSTOM_PROPERTY)) {
    if (into.size >= cap && !into.has(name)) return;
    const value = tidy(rawValue);
    if (!isColor(value) || isPlaceholder(value)) continue;
    const existing = into.get(name);
    if (existing) {
      // Keep a few alternatives — the light/dark or layered overrides — so the
      // resolver can pick one that actually yields a colour. Bounded, or a
      // heavily themed sheet stores dozens of near-identical strings.
      if (existing.length < 4 && !existing.includes(value)) existing.push(value);
    } else {
      into.set(name, [value]);
    }
  }
}

/**
 * Reads at most MAX_CSS_BYTES, then cancels the stream.
 *
 * `await response.text()` buffers the WHOLE body before any cap can be applied, so
 * slicing afterwards limits what is parsed and not what is downloaded — a 200MB or
 * endlessly streaming stylesheet is fully resident first, and the on-demand view
 * repeats that for up to 40 sheets. Reading chunk by chunk and cancelling bounds
 * the memory, not just the parse.
 */
async function readCapped(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let text = "";
  let bytes = 0;
  try {
    while (bytes < LIMITS.MAX_CSS_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      const remaining = LIMITS.MAX_CSS_BYTES - bytes;
      const slice = value.byteLength > remaining ? value.subarray(0, remaining) : value;
      bytes += slice.byteLength;
      text += decoder.decode(slice, { stream: true });
    }
    text += decoder.decode();
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return text;
}

/**
 * Reads linked stylesheets for colour tokens.
 *
 * Bounded on three axes because none of them is bounded by the site: how many
 * sheets (linear.app links 54), how many bytes of each, and how many tokens are
 * kept (primer.style publishes 842, and every one would be persisted into the
 * cache). Each bound is a deliberate sample, and `truncated` says so rather than
 * presenting a capped list as a complete one.
 *
 * Never throws. A sheet that fails is counted in `unchecked`: its tokens are
 * unknown, which is not the same as a stylesheet that defines none.
 */
export async function fetchStylesheetTokens(
  hrefs: readonly string[],
  pageUrl: string,
  signal?: AbortSignal,
  options: { maxSheets?: number; maxTokens?: number } = {},
): Promise<{ tokens: ThemeColor[]; scanned: number; linked: number; unchecked: number; truncated: boolean }> {
  // The dig uses the tight defaults. The on-demand view raises both: the user
  // asked for the whole palette, the requests are no longer on the dig's critical
  // path, and the result is never persisted, so the cache-size argument for the
  // 200-token cap does not apply there.
  const maxSheets = options.maxSheets ?? LIMITS.MAX_STYLESHEETS;
  const maxTokens = options.maxTokens ?? LIMITS.MAX_THEME_TOKENS;
  const targets = hrefs.slice(0, maxSheets);
  const found = new Map<string, string[]>();
  let scanned = 0;
  let unchecked = 0;

  for (const href of targets) {
    if (found.size >= maxTokens) break;
    try {
      const timeout = AbortSignal.timeout(TIMEOUTS.STYLESHEET);
      // Every hop re-checked: these URLs come from page content, so the
      // destination is the page author's choice, not the user's.
      const response = await fetchPageSuppliedUrl(href, pageUrl, {
        headers: { "Accept-Encoding": "identity" },
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      extractTokensFromCss(await readCapped(response), found, maxTokens);
      scanned++;
    } catch (error) {
      unchecked++;
      log.warn("stylesheet:unchecked", {
        url: redactUrlForLog(href),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    tokens: resolveTokenColors(found),
    scanned,
    linked: hrefs.length,
    unchecked,
    truncated: found.size >= maxTokens || hrefs.length > targets.length,
  };
}

/**
 * Folds stylesheet tokens into theme data parsed from markup.
 *
 * Markup wins on a name collision: an inline `<style>` or a `style` attribute is
 * more specific to the page than a shared stylesheet.
 */
export function withStylesheetTokens(
  base: ThemeData | undefined,
  result: Awaited<ReturnType<typeof fetchStylesheetTokens>>,
): ThemeData | undefined {
  if (result.scanned === 0 && result.unchecked === 0) return base;

  const seed: ThemeData = base ?? {
    themeColors: [],
    attributes: {},
    vendorColors: [],
    tokens: [],
  };
  const existing = new Set(seed.tokens.map((t) => t.name));
  const merged = [...seed.tokens, ...result.tokens.filter((t) => !existing.has(t.name))];

  return {
    ...seed,
    tokens: merged.slice(0, LIMITS.MAX_THEME_TOKENS),
    stylesheets: {
      scanned: result.scanned,
      linked: result.linked,
      unchecked: result.unchecked,
      truncated: result.truncated || merged.length > LIMITS.MAX_THEME_TOKENS,
    },
  };
}

/**
 * Resolves `var(--other)` references and computes a hex for each token.
 *
 * Two separate reasons a swatch came up empty, and this fixes both. A value like
 * `hsl(var(--color-red-50))` is an INDIRECTION — the colour is real, it is just
 * one hop away — and `oklch(82.8% .189 84.429)` is a concrete colour in a space
 * Raycast cannot tint. Neither is "a variable that requires calculation" in the
 * sense of needing a browser: both are computable here.
 *
 * Cycle-safe, because a self-reference is not hypothetical: Tailwind v4 emits
 * `--color-red-50: hsl(var(--color-red-50))` in one layer while the raw channels
 * live in another, and following that naively never terminates.
 */
export function resolveTokenColors(declarations: Map<string, string[]>): ThemeColor[] {
  /**
   * `used` keys a NAME PLUS THE EXACT DECLARATION being expanded, not just the
   * name. Tailwind v4 writes `--color-red-50: hsl(var(--color-red-50))` in one
   * layer and `--color-red-50: 0 86% 97%` in another; blocking the whole name on
   * re-entry — the obvious cycle guard — makes the token unresolvable, because
   * the reference can only be satisfied by its own sibling declaration.
   */
  const resolve = (value: string, used: Set<string>, depth = 0): string | undefined => {
    if (depth > 8) return undefined;
    const direct = toHex(value);
    if (direct) return direct;

    let substituted = value;
    let changed = false;
    for (const [, name, fallback] of value.matchAll(/var\(\s*(--[\w-]+)\s*(?:,([^()]*))?\)/g)) {
      let replacement: string | undefined;
      for (const candidate of declarations.get(name) ?? []) {
        const key = `${name}::${candidate}`;
        if (used.has(key)) continue;
        const next = new Set([...used, key]);
        const nested = resolve(candidate, next, depth + 1);
        if (nested) {
          replacement = nested;
          break;
        }
        // Bare channels (`0 86% 97%`) are not a colour alone but are one once
        // substituted into the `hsl()` / `rgb()` that references them.
        if (CHANNELS.test(candidate)) {
          replacement = candidate.trim();
          break;
        }
      }
      if (replacement === undefined && fallback !== undefined && fallback.trim() !== "") {
        replacement = fallback.trim();
      }
      if (replacement !== undefined) {
        substituted = substituted.replace(/var\(\s*--[\w-]+\s*(?:,[^()]*)?\)/, replacement);
        changed = true;
      }
    }
    return changed ? resolve(substituted, used, depth + 1) : undefined;
  };

  const tokens: ThemeColor[] = [];
  for (const [name, values] of declarations) {
    let chosen: string | undefined;
    let hex: string | undefined;
    for (const value of values) {
      const resolved = resolve(value, new Set([`${name}::${value}`]));
      if (resolved) {
        chosen = value;
        hex = resolved;
        break;
      }
    }
    // Nothing resolved. Keep it only if the declaration is unambiguously a
    // colour — a lone `var(--x)` or a colour function wrapping one. Anything
    // else that merely CONTAINS a var() is a shadow, gradient, blur or easing
    // curve, and x.com listed 22 of those as "color tokens" before this check:
    // `--tw-shadow: 0 1px 3px 0 var(--tw-shadow-color,#0000001a)` is not a colour.
    if (chosen === undefined) {
      const colorShaped = values.find((v) => COLOR_REFERENCE.test(v));
      if (colorShaped === undefined) continue;
      chosen = colorShaped;
    }
    tokens.push({ name, value: chosen, hex, source: "stylesheet" });
  }
  return tokens;
}
