import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";

/**
 * SVG discovery for the on-demand "View All SVGs" grid.
 *
 * Modeled on svg-gobbler's content script, minus everything that needs a live
 * DOM. svg-gobbler reads computed styles, open shadow roots and `contentDocument`
 * from a rendered page; Digger has one fetched HTML document and cheerio. So
 * this finds what the markup itself declares — inline `<svg>`, sprite symbols,
 * `<img>`/`<picture>`/`<object>`/`<embed>`/`<iframe>` references, SVG favicons,
 * `url()` in `<style>` and `style=""`, `<template>` contents, and data URIs
 * anywhere among those — and nothing a script paints or an external stylesheet
 * applies.
 *
 * Every markup it returns is meant to be a standalone .svg file: XML-serialized,
 * with the namespaces it uses declared, the page-level definitions it references
 * copied in, and relative references made absolute.
 *
 * Deliberately free of `@raycast/api` and of the rest of `utils/`, so it can be
 * exercised directly under `node --test`.
 */

export type SvgSource = "inline" | "sprite" | "img" | "object" | "css" | "favicon" | "meta";

export interface SvgAsset {
  /** Dedupe key: normalized markup, or the absolute URL. */
  key: string;
  source: SvgSource;
  /** Best available human name — never a CSS-module hash. */
  name: string;
  /** The SVG text, when the page carried it (inline, sprite, data URI). */
  markup?: string;
  /** Absolute URL, when the SVG is a separate file. */
  url?: string;
  /** UTF-8 size of `markup`; 0 when only a URL is known. */
  bytes: number;
  /** How many times the page uses it. 0 for a sprite symbol nothing references. */
  occurrences: number;
}

/** An external sprite file referenced by `<use href="file.svg#id">`. */
export interface ExternalSprite {
  /** Absolute URL of the file, without the fragment. */
  url: string;
  ids: string[];
  /** Occurrences per symbol id. A prototype-free record: ids are page-chosen. */
  uses: Record<string, number>;
}

export interface SvgScan {
  /** Largest first, capped at `maxAssets`. */
  assets: SvgAsset[];
  /** Every occurrence counted, before the cap — external sprite uses included. */
  total: number;
  truncated: boolean;
  externalSprites: ExternalSprite[];
}

/** An SVG the dig already found elsewhere — Open Graph, JSON-LD, the manifest. */
export interface KnownSvg {
  url: string;
  name?: string;
}

const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";
const XHTML_NS = "http://www.w3.org/1999/xhtml";

/** Children that carry no pixels of their own. */
const NON_RENDERING = new Set([
  "defs",
  "symbol",
  "title",
  "desc",
  "metadata",
  "style",
  "script",
  "lineargradient",
  "radialgradient",
  "pattern",
  "clippath",
  "mask",
  "filter",
  "marker",
]);

/** Elements whose `href` loads a resource, and so must survive leaving the page. */
const RESOURCE_HREF_ELEMENTS = new Set(["image", "use", "feimage"]);

/** Class tokens that name nothing in particular. */
const GENERIC_NAMES = new Set(["icon", "svg", "image", "img", "logo-svg", "styles", "style", "index", "module"]);

/** Past this many borrowed definitions the reference graph is pathological, not a sprite. */
const MAX_BORROWED = 2000;

/** A parsed document plus what every lookup needs, built once per document. */
interface Doc {
  $: cheerio.CheerioAPI;
  /** The document's base URL — `<base href>` when present, else the page URL. */
  base: string;
  /** First element per id. Looking ids up by scanning `[id]` each time made a large page take seconds. */
  ids: Map<string, Element>;
  /** Namespace declarations on the document root, for prefixes a copied fragment still uses. */
  namespaces: Record<string, string>;
}

export function isSvgUrl(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim();
  if (/^data:image\/svg\+xml[;,]/i.test(v)) return true;
  const path = v.split(/[?#]/)[0];
  return /\.svg$/i.test(path);
}

export function svgDataUri(markup: string): string {
  return "data:image/svg+xml," + encodeURIComponent(markup);
}

function utf8Bytes(text: string): number {
  return Buffer.byteLength(text, "utf8");
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

function resolve(url: string, base: string): string | undefined {
  try {
    return new URL(url.trim(), base).href;
  } catch {
    return undefined;
  }
}

/** The first element child of a parsed document, skipping comments and processing instructions. */
function rootElement($: cheerio.CheerioAPI): Element | undefined {
  return $.root()
    .contents()
    .toArray()
    .find((n): n is Element => n.type === "tag");
}

/**
 * Parses SVG text as XML and re-serializes its root, or undefined when the root
 * is not `<svg>`. Re-serializing is what makes a lenient parse's repair of
 * malformed input into well-formed output.
 *
 * Judging by the ROOT, not by whether `<svg` appears somewhere, is the point: a
 * soft-404 HTML page with an icon in its header contains `<svg` too.
 */
export function parseSvgDocument(text: string): string | undefined {
  if (!/<svg[\s>/]/i.test(text)) return undefined;
  const $ = cheerio.load(text, { xml: true });
  const root = rootElement($);
  if (!root || root.name.toLowerCase() !== "svg") return undefined;
  return standalone($.xml(root), namespacesOf(root));
}

/** Decodes a `data:image/svg+xml` URI into standalone markup, or undefined when it holds no SVG. */
function decodeSvgDataUri(uri: string): string | undefined {
  const match = /^data:image\/svg\+xml([^,]*),([\s\S]*)$/i.exec(uri.trim());
  if (!match) return undefined;
  const [, params, raw] = match;
  if (/;base64/i.test(params)) {
    // `#` is not in the base64 alphabet, so one always starts a fragment; and
    // `%3D` padding is legal URL encoding of the payload.
    const payload = safeDecode(raw.split("#")[0]).replace(/\s+/g, "");
    return parseSvgDocument(Buffer.from(payload, "base64").toString("utf8"));
  }
  // A raw `#` may be a fragment (`…%3C%2Fsvg%3E#a`) or an unencoded color
  // (`fill='#fff'`, which is common in hand-written CSS). Try the fragment
  // reading first; keep it only if the payload still ends like a document.
  const fragment = /#[\w.:%-]*$/.exec(raw);
  if (fragment) {
    const withoutFragment = safeDecode(raw.slice(0, fragment.index)).trim();
    if (withoutFragment.endsWith(">")) return parseSvgDocument(withoutFragment);
  }
  return parseSvgDocument(safeDecode(raw));
}

function namespacesOf(el: Element): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(el.attribs)) {
    if (name.startsWith("xmlns:")) out[name.slice(6)] = value;
  }
  return out;
}

/**
 * Adds the namespace declarations a standalone file needs: the SVG default,
 * XLink when used, and any other prefix the markup uses that `known` declares
 * (Inkscape and Sketch sprite files carry their own).
 */
function withNamespaces(markup: string, known: Record<string, string> = {}): string {
  const open = /^<svg\b[^>]*>/i.exec(markup);
  if (!open) return markup;
  const tag = open[0];
  const decls: string[] = [];
  if (!/\sxmlns\s*=/i.test(tag)) decls.push(`xmlns="${SVG_NS}"`);
  const declared = (prefix: string) => new RegExp(`\\sxmlns:${prefix}\\s*=`, "i").test(tag);
  const used = (prefix: string) => new RegExp(`[\\s<]${prefix}:[\\w-]`).test(markup);
  if (used("xlink") && !declared("xlink")) decls.push(`xmlns:xlink="${XLINK_NS}"`);
  for (const [prefix, uri] of Object.entries(known)) {
    if (prefix === "xlink" || prefix === "xml" || declared(prefix) || !used(prefix)) continue;
    decls.push(`xmlns:${prefix}="${escapeAttr(uri)}"`);
  }
  if (decls.length === 0) return markup;
  return tag.replace(/^<svg/i, `<svg ${decls.join(" ")}`) + markup.slice(tag.length);
}

/** Attributes that name or label rather than style — never rewritten as CSS. */
const NON_CSS_ATTR =
  /^(?:id|class|href|xlink:href|aria-[\w-]+|data-[\w-]+|role|title|lang|xml:lang|xmlns(?::[\w-]+)?)$/i;

/**
 * Applies `fn` to the CSS in SVG markup and nowhere else: `<style>` contents and
 * attribute values. Text nodes, comments, and naming attributes pass through
 * untouched — `<text>currentColor</text>` is a word someone wrote, not a color.
 */
function mapCss(markup: string, fn: (css: string) => string): string {
  const attrs = (tag: string) =>
    tag.replace(/(\s)([\w:.-]+)(\s*=\s*)("([^"]*)"|'([^']*)')/g, (whole, sp, name, eq, _q, dq, sq) => {
      if (NON_CSS_ATTR.test(name)) return whole;
      return dq !== undefined ? `${sp}${name}${eq}"${fn(dq)}"` : `${sp}${name}${eq}'${fn(sq)}'`;
    });
  return markup.replace(
    /(<style\b[^>]*>)([\s\S]*?)(<\/style>)|<!--[\s\S]*?-->|<[a-zA-Z][^>]*>/gi,
    (match, open, body, close) =>
      open !== undefined ? attrs(open) + fn(body) + close : match.startsWith("<!--") ? match : attrs(match),
  );
}

/**
 * `var(--name, fallback)` resolved to its fallback when the SVG does not declare
 * `--name` itself.
 *
 * Stripe paints its logos with `fill="var(--caseStudyLogoColor, #000)"`, where
 * the variable lives in the page's stylesheet. Out of the page that stylesheet
 * is gone: Raycast happened to fall back to `#000`, but AppKit — which Copy as
 * PNG uses — and plenty of design tools draw nothing at all, so the logo
 * exported as an empty image. A variable the SVG declares itself stays live,
 * and one with no fallback is left alone, since there is nothing to resolve it to.
 */
function resolvePageVariables(markup: string): string {
  if (!markup.includes("var(")) return markup;
  const declared = new Set<string>();
  mapCss(markup, (css) => {
    for (const m of css.matchAll(/(--[\w-]+)\s*:/g)) declared.add(m[1]);
    return css;
  });
  const resolve = (text: string): string => {
    let out = "";
    let i = 0;
    for (;;) {
      const at = text.indexOf("var(", i);
      if (at < 0) return out + text.slice(i);
      // The matching close paren: fallbacks nest, e.g. var(--a, rgb(1, 2, 3)).
      let depth = 0;
      let end = -1;
      for (let j = at + 3; j < text.length; j++) {
        if (text[j] === "(") depth++;
        else if (text[j] === ")" && --depth === 0) {
          end = j;
          break;
        }
      }
      if (end < 0) return out + text.slice(i);
      const body = text.slice(at + 4, end);
      const comma = body.indexOf(",");
      const name = (comma < 0 ? body : body.slice(0, comma)).trim();
      const call = text.slice(at, end + 1);
      out += text.slice(i, at) + (comma < 0 || declared.has(name) ? call : resolve(body.slice(comma + 1).trim()));
      i = end + 1;
    }
  };
  return mapCss(markup, resolve);
}

/** What every exported markup passes through last: page variables resolved, namespaces declared. */
function standalone(markup: string, known: Record<string, string> = {}): string {
  return withNamespaces(resolvePageVariables(markup), known);
}

/** Root attributes that never change the pixels. */
const LABEL_ATTRS = /\s(?:aria-[\w-]+|role|focusable|data-[\w-]+)\s*=\s*("[^"]*"|'[^']*')/gi;
const SIZE_ATTRS = /\s(?:width|height)\s*=\s*("[^"]*"|'[^']*')/gi;
const SELECTOR_ATTRS = /\s(?:class|id)\s*=\s*("[^"]*"|'[^']*')/gi;
/** React `useId` output: `_R_59unacplei_` (19) and `:r1:` / `:R1pbd:` (18). */
const REACT_ID = /_R_[a-z0-9]+_|:[rR][a-z0-9]*:/gi;

/**
 * The dedupe key — what decides that two SVGs are one artwork.
 *
 * The same logo is routinely inlined at two sizes, once per theme with a
 * different class, or once per React component instance with fresh generated
 * ids. So the key drops, from the ROOT tag only:
 *
 * - labels (`aria-*`, `role`, `data-*`), which never change pixels;
 * - `width`/`height`, but only when a `viewBox` fixes the geometry — without
 *   one they ARE the viewport, and `<rect width="100%">` draws differently;
 * - `class`/`id`, but only when no embedded `<style>` could select the root.
 *
 * `style` always stays: it travels with the export and can set the fill.
 * React ids are renamed by order of first appearance, so the relationships
 * between them survive — two SVGs that point `fill` at different gradients
 * stay two SVGs.
 */
function normalizeMarkup(markup: string): string {
  const ids = new Map<string, string>();
  const collapsed = markup
    .replace(/>\s+</g, "><")
    .replace(/\s+/g, " ")
    .replace(REACT_ID, (id) => {
      if (!ids.has(id)) ids.set(id, `{id${ids.size}}`);
      return ids.get(id)!;
    })
    .trim();
  const open = /^<svg\b[^>]*>/i.exec(collapsed);
  if (!open) return collapsed;
  let tag = open[0].replace(LABEL_ATTRS, "");
  if (/\sviewBox\s*=/i.test(tag)) tag = tag.replace(SIZE_ATTRS, "");
  if (!/<style[\s>]/i.test(collapsed)) tag = tag.replace(SELECTOR_ATTRS, "");
  return tag + collapsed.slice(open[0].length);
}

function hrefOf(el: Element): string | undefined {
  return el.attribs["href"] ?? el.attribs["xlink:href"];
}

function humanizeFilename(url: string): string | undefined {
  try {
    const last = safeDecode(new URL(url).pathname.split("/").pop() ?? "");
    const stem = last.replace(/\.svg$/i, "");
    return stem || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Utility-class vocabularies (Tailwind and its imitators). `fill-none` or
 * `shrink-0` describes how an icon is drawn, never what it is.
 */
const UTILITY_CLASS =
  /^(?:fill|stroke|text|bg|w|h|size|min|max|[mp][trblxy]?|inset|top|left|right|bottom|z|opacity|rotate|scale|translate|transition|transform|duration|ease|delay|animate|rounded|shadow|border|outline|ring|flex|grid|inline|block|hidden|visible|invisible|absolute|relative|fixed|sticky|shrink|grow|basis|order|col|row|gap|space|items|justify|self|place|content|overflow|pointer|select|cursor|align|leading|tracking|font|decoration|underline|aspect|object|origin|sr|group|peer|dark|light|contents|isolate|will|mix|fill-current|stroke-current)(?:-|$)/i;

/** A class token worth showing: letters and dashes, not a generated hash or a utility. */
function readableToken(token: string): boolean {
  return (
    /^[a-z][a-z-]*[a-z]$/i.test(token) &&
    token.length >= 3 &&
    !GENERIC_NAMES.has(token.toLowerCase()) &&
    !UTILITY_CLASS.test(token)
  );
}

function nameFromClasses(className: string | undefined): string | undefined {
  if (!className) return undefined;
  const tokens = className.split(/\s+/).filter(Boolean);

  // CSS modules: `Navbar-module__pSp8Ga__logo` → "Navbar logo".
  for (const token of tokens) {
    const m = /^(.+?)[-_.]module__[^_]+__(.+)$/.exec(token);
    if (m) {
      const module = m[1];
      const part = m[2].replace(/_+[A-Za-z0-9]{5,}$/, "");
      const genericModule = GENERIC_NAMES.has(module.toLowerCase());
      const genericPart = GENERIC_NAMES.has(part.toLowerCase());
      if (genericModule && genericPart) continue;
      if (genericPart) return module;
      return genericModule ? part : `${module} ${part}`;
    }
  }
  // BEM: `navigation__chevron-down-icon` → "chevron-down-icon".
  for (const token of tokens) {
    const idx = token.lastIndexOf("__");
    if (idx > 0) {
      const part = token.slice(idx + 2);
      if (readableToken(part)) return part;
    }
  }
  return tokens.find(readableToken);
}

function inferElementName($: cheerio.CheerioAPI, el: Element): string | undefined {
  const title = $(el).children("title").first().text().trim();
  if (title) return title;
  const own = el.attribs["aria-label"]?.trim() || el.attribs["id"]?.trim();
  if (own) return own;
  for (const attr of ["data-icon", "data-name", "data-testid"]) {
    const v = el.attribs[attr]?.trim();
    if (v) return v;
  }
  // An icon inside a labeled link or button is named by that control.
  let parent = el.parent;
  for (let depth = 0; depth < 3 && parent && parent.type === "tag"; depth++) {
    const label = (parent as Element).attribs["aria-label"]?.trim() || (parent as Element).attribs["title"]?.trim();
    if (label) return label;
    parent = parent.parent;
  }
  return nameFromClasses(el.attribs["class"]);
}

const URL_REF = /url\(\s*['"]?#([^)'"\s]+)['"]?\s*\)/gi;

/**
 * Every same-document id an element and its descendants point at: `href` and
 * `xlink:href` fragments, `url(#id)` in any attribute (case-insensitively, as
 * CSS is), and `url(#id)` inside an embedded `<style>` — the pattern Illustrator
 * exports as `.st0{fill:url(#SVGID_1_)}`. Percent-encoded fragments decode to
 * the id they name.
 */
function localReferences($: cheerio.CheerioAPI, root: Element): string[] {
  const ids = new Set<string>();
  const visit = (el: Element) => {
    for (const [name, value] of Object.entries(el.attribs)) {
      if ((name === "href" || name === "xlink:href") && value.startsWith("#")) ids.add(safeDecode(value.slice(1)));
      for (const m of value.matchAll(URL_REF)) ids.add(safeDecode(m[1]));
    }
    if (el.name.toLowerCase() === "style") {
      for (const m of $(el).text().matchAll(URL_REF)) ids.add(safeDecode(m[1]));
    }
  };
  visit(root);
  $(root)
    .find("*")
    .each((_, el) => visit(el as Element));
  return [...ids];
}

function isInside(el: Element, ancestors: Set<Element>): boolean {
  for (let p = el.parent; p; p = p.parent) {
    if (p.type === "tag" && ancestors.has(p as Element)) return true;
  }
  return false;
}

/**
 * Serializes `root` (whose own markup is `outer`) as a standalone file: every id
 * it references that lives elsewhere in the document is copied into a leading
 * `<defs>`, following references from the copies in turn until none are left.
 * An element whose ancestor is also copied is not copied again — that would
 * duplicate its id.
 */
function selfContained(doc: Doc, root: Element, outer: string): string {
  const { $ } = doc;
  const inside = new Set<string>();
  const addIds = (el: Element) => {
    if (el.attribs["id"]) inside.add(el.attribs["id"]);
    $(el)
      .find("[id]")
      .each((_, d) => {
        inside.add((d as Element).attribs["id"]);
      });
  };
  addIds(root);

  const borrowed: Element[] = [];
  const queue = localReferences($, root).filter((id) => !inside.has(id));
  const seen = new Set<string>();
  while (queue.length > 0 && borrowed.length < MAX_BORROWED) {
    const id = queue.shift()!;
    if (seen.has(id) || inside.has(id)) continue;
    seen.add(id);
    const target = doc.ids.get(id);
    if (!target || target === root || isInside(target, new Set([root]))) continue;
    borrowed.push(target);
    for (const next of localReferences($, target)) if (!seen.has(next)) queue.push(next);
  }

  const set = new Set(borrowed);
  const outermost = borrowed.filter((el) => !isInside(el, set));
  if (outermost.length === 0) return outer;
  const open = /^<svg\b[^>]*>/i.exec(outer);
  if (!open) return outer;
  return open[0] + `<defs>${outermost.map((el) => $.xml(el)).join("")}</defs>` + outer.slice(open[0].length);
}

/**
 * A standalone `<svg>` built from a `<symbol>`. The symbol's own attributes —
 * `viewBox`, but also `fill`, `stroke`, `style` — are the artwork's defaults, so
 * they move onto the new root; only its `id` stays behind.
 */
function symbolToSvg(doc: Doc, symbol: Element): string {
  const { $ } = doc;
  const attrs = Object.entries(symbol.attribs)
    .filter(([name]) => name !== "id" && name !== "xmlns" && !name.startsWith("xmlns:"))
    .map(([name, value]) => `${name}="${escapeAttr(value)}"`);
  // One node at a time: `$.xml()` on a selection still serializes it as HTML.
  const inner = $(symbol)
    .contents()
    .toArray()
    .map((node) => $.xml(node))
    .join("");
  const shell = `<svg xmlns="${SVG_NS}"${attrs.length ? " " + attrs.join(" ") : ""}>${inner}</svg>`;
  return standalone(selfContained(doc, symbol, shell), doc.namespaces);
}

function isHidden(el: Element): boolean {
  const style = (el.attribs["style"] ?? "").replace(/\s+/g, "").toLowerCase();
  return (
    style.includes("display:none") ||
    (el.attribs["aria-hidden"] === "true" && (el.attribs["width"] === "0" || el.attribs["height"] === "0")) ||
    el.attribs["hidden"] !== undefined
  );
}

function renderingChildren(el: Element): Element[] {
  return el.children.filter(
    (c): c is Element => c.type === "tag" && !NON_RENDERING.has((c as Element).name.toLowerCase()),
  );
}

/** Wrapper-root attributes that do not change how the symbol inside it draws. */
const NEUTRAL_WRAPPER_ATTR =
  /^(?:width|height|class|id|aria-[\w-]+|role|focusable|data-[\w-]+|viewbox|version|xmlns(?::[\w-]+)?)$/i;
const NEUTRAL_USE_ATTR = /^(?:href|xlink:href|class|aria-[\w-]+|role|data-[\w-]+)$/i;

/**
 * `<svg class="icon"><use href="#star"/></svg>` — a bare instance of a symbol,
 * which is the symbol's artwork and nothing else. A wrapper that adds a fill,
 * a style, or a transform is a different picture and is kept as its own asset.
 */
function isBareSymbolUse(svg: Element, use: Element): boolean {
  const neutralRoot = Object.keys(svg.attribs).every((name) => NEUTRAL_WRAPPER_ATTR.test(name));
  const neutralUse = Object.entries(use.attribs).every(
    ([name, value]) => NEUTRAL_USE_ATTR.test(name) || ((name === "x" || name === "y") && Number(value) === 0),
  );
  return neutralRoot && neutralUse;
}

class Collector {
  private byKey = new Map<string, SvgAsset>();
  private fallbackCount = 0;
  total = 0;

  add(asset: Omit<SvgAsset, "occurrences" | "name"> & { name?: string }, count = 1): void {
    this.total += count;
    const existing = this.byKey.get(asset.key);
    if (existing) {
      existing.occurrences += count;
      return;
    }
    this.byKey.set(asset.key, {
      ...asset,
      name: asset.name || `SVG ${++this.fallbackCount}`,
      occurrences: count,
    });
  }

  has(key: string): boolean {
    return this.byKey.has(key);
  }

  addMarkup(source: SvgSource, markup: string, name?: string, count = 1): void {
    this.add({ key: "m:" + normalizeMarkup(markup), source, markup, bytes: utf8Bytes(markup), name }, count);
  }

  /** A reference, already resolved against the document base or still a data URI. */
  addRef(source: SvgSource, ref: string, name?: string): void {
    if (/^data:/i.test(ref)) {
      const decoded = decodeSvgDataUri(ref);
      if (decoded !== undefined) this.addMarkup(source, decoded, name);
      return;
    }
    if (!/^https?:/i.test(ref)) return;
    this.add({ key: "u:" + ref, source, url: ref, bytes: 0, name: name || humanizeFilename(ref) });
  }

  values(): SvgAsset[] {
    return [...this.byKey.values()];
  }
}

/** A reference as the page would load it: data URIs as-is, everything else absolute. */
function absolute(ref: string, base: string): string | undefined {
  const trimmed = ref.trim();
  if (/^data:/i.test(trimmed)) return trimmed;
  return resolve(trimmed, base);
}

const CSS_URL = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"\s][^)]*?))\s*\)/gi;

function cssUrls(css: string): string[] {
  const out: string[] = [];
  // Commented-out rules are not references.
  const live = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of live.matchAll(CSS_URL)) out.push((m[1] ?? m[2] ?? m[3] ?? "").trim());
  return out;
}

/**
 * Candidate URLs from a `srcset`, per the HTML parsing algorithm: a URL is a run
 * of non-whitespace (so a data URI keeps its commas), a trailing comma ends a
 * candidate with no descriptors, and otherwise descriptors run to the next
 * comma outside parentheses. Minified markup — `a.svg 1x,b.svg 2x` — has no
 * space after the comma, which a split on `, ` misses.
 */
function srcsetUrls(srcset: string | undefined): string[] {
  if (!srcset) return [];
  const out: string[] = [];
  let i = 0;
  const n = srcset.length;
  while (i < n) {
    while (i < n && (/\s/.test(srcset[i]) || srcset[i] === ",")) i++;
    if (i >= n) break;
    const start = i;
    while (i < n && !/\s/.test(srcset[i])) i++;
    let url = srcset.slice(start, i);
    if (url.endsWith(",")) {
      url = url.replace(/,+$/, "");
      if (url) out.push(url);
      continue;
    }
    let depth = 0;
    while (i < n) {
      const c = srcset[i++];
      if (c === "(") depth++;
      else if (c === ")") depth--;
      else if (c === "," && depth <= 0) break;
    }
    out.push(url);
  }
  return out;
}

/**
 * Readies a private parse tree for export, once, before anything reads it.
 *
 * - Namespace prefixes go back on attribute names. The HTML parser stores
 *   `xlink:href` under `href` with the prefix kept aside; the XML serializer does
 *   not restore it, so an export would silently become SVG 2's bare `href`,
 *   which older tools and rasterizers do not read.
 * - HTML inside `<foreignObject>` gets its XHTML namespace, which the HTML parse
 *   implies and a standalone XML file must declare.
 * - Relative resource references become absolute (see absolutizeResources).
 */
function prepareTree($: cheerio.CheerioAPI, base: string): void {
  $("svg, svg *").each((_, node) => {
    const el = node as Element & { "x-attribsPrefix"?: Record<string, string | undefined> };
    const prefixes = el["x-attribsPrefix"];
    if (prefixes) {
      for (const [name, prefix] of Object.entries(prefixes)) {
        if (!prefix || !(name in el.attribs)) continue;
        el.attribs[`${prefix}:${name}`] = el.attribs[name];
        delete el.attribs[name];
      }
    }
    const tag = el.name.toLowerCase();
    if (tag === "foreignobject") {
      for (const child of el.children) {
        if (
          child.type === "tag" &&
          (child as Element).name.toLowerCase() !== "svg" &&
          !("xmlns" in (child as Element).attribs)
        ) {
          (child as Element).attribs["xmlns"] = XHTML_NS;
        }
      }
    }
  });
  absolutizeResources($, base);
}

/**
 * Relative resource references (`<image>`, `<use>`, `<feImage>`) become
 * absolute. Out of the page or sprite file — in a thumbnail, a copied file —
 * there is no base URL left to resolve them against.
 */
function absolutizeResources($: cheerio.CheerioAPI, base: string): void {
  // CSS references too: `url(./paint.svg#g)` in a style, a `<style>` or a
  // presentation attribute would otherwise resolve against wherever the file
  // is saved, not the page it came from.
  const cssUrls = (css: string) =>
    css.replace(/url\(\s*(["']?)([^)"']*)\1\s*\)/gi, (call: string, quote: string, ref: string) => {
      if (!ref || ref.startsWith("#") || /^data:/i.test(ref)) return call;
      const abs = resolve(ref, base);
      return abs ? `url(${quote}${abs}${quote})` : call;
    });
  $("svg, svg *").each((_, node) => {
    const el = node as Element;
    if (localName(el.name) === "style") $(el).text(cssUrls($(el).text()));
    for (const [name, value] of Object.entries(el.attribs)) {
      if (!NON_CSS_ATTR.test(name) && /url\(/i.test(value)) el.attribs[name] = cssUrls(value);
    }
    if (!RESOURCE_HREF_ELEMENTS.has(el.name.toLowerCase())) return;
    for (const name of ["href", "xlink:href"]) {
      const value = el.attribs[name];
      if (!value || value.startsWith("#") || /^data:/i.test(value)) continue;
      const abs = resolve(value, base);
      if (abs) el.attribs[name] = abs;
    }
  });
}

function indexIds($: cheerio.CheerioAPI): Map<string, Element> {
  const ids = new Map<string, Element>();
  $("[id]").each((_, node) => {
    const el = node as Element;
    const id = el.attribs["id"];
    if (!ids.has(id)) ids.set(id, el);
  });
  return ids;
}

/**
 * The definition an element sits in: the nearest enclosing `<symbol>`'s id,
 * `null` for a bare `<defs>` (or a symbol without an id), undefined when it is
 * not inside a definition at all.
 */
function enclosingDefinition(el: Element): string | null | undefined {
  for (let p = el.parent; p; p = p.parent) {
    if (p.type !== "tag") continue;
    const name = (p as Element).name.toLowerCase();
    if (name === "symbol") return (p as Element).attribs["id"] ?? null;
    if (name === "defs") return null;
  }
  return undefined;
}

/**
 * How many times an element is actually drawn: once outside any definition, as
 * often as its enclosing `<symbol>` is used, and never inside a bare `<defs>`.
 */
function definitionUses(el: Element, symbolUses: Map<string, number>): number {
  const owner = enclosingDefinition(el);
  if (owner === undefined) return 1;
  return owner === null ? 0 : (symbolUses.get(owner) ?? 0);
}

function scanDocument(doc: Doc, collector: Collector, sprites: Map<string, ExternalSprite>): void {
  const { $, base } = doc;

  // How many times each local symbol is actually drawn. A use outside any
  // definition draws it once. A use inside another symbol draws it as often as
  // THAT symbol is drawn, so a symbol reached only through another one is not
  // "unused". A use inside a bare `<defs>` draws nothing on its own.
  const symbolIds = new Set(($("symbol[id]").get() as Element[]).map((el) => el.attribs["id"]));
  const direct = new Map<string, number>();
  const usedBy = new Map<string, string[]>(); // symbol → the symbols whose bodies use it, once per use
  ($("use").get() as Element[]).forEach((use) => {
    const href = hrefOf(use);
    if (!href?.startsWith("#")) return;
    const id = safeDecode(href.slice(1));
    if (!symbolIds.has(id)) return;
    const owner = enclosingDefinition(use);
    if (owner === undefined) direct.set(id, (direct.get(id) ?? 0) + 1);
    else if (owner !== null) usedBy.set(id, [...(usedBy.get(id) ?? []), owner]);
  });
  const symbolUses = new Map<string, number>();
  const effective = (id: string, visiting: Set<string>): number => {
    const known = symbolUses.get(id);
    if (known !== undefined) return known;
    if (visiting.has(id)) return 0; // a cycle draws nothing more
    visiting.add(id);
    const total =
      (direct.get(id) ?? 0) + (usedBy.get(id) ?? []).reduce((n, owner) => n + effective(owner, visiting), 0);
    visiting.delete(id);
    symbolUses.set(id, total);
    return total;
  };
  symbolIds.forEach((id) => effective(id, new Set()));

  $("symbol[id]").each((_, node) => {
    const el = node as Element;
    const id = el.attribs["id"];
    const markup = symbolToSvg(doc, el);
    collector.add(
      { key: "m:" + normalizeMarkup(markup), source: "sprite", markup, bytes: utf8Bytes(markup), name: id },
      symbolUses.get(id) ?? 0,
    );
  });

  $("svg").each((_, node) => {
    const el = node as Element;
    if ($(el).parents("svg").length > 0) return;

    // External references are recorded for the view to fetch.
    const uses = $(el).find("use").get() as Element[];
    const external = uses.filter((u) => {
      const href = hrefOf(u);
      return href !== undefined && !href.startsWith("#");
    });
    for (const u of external) {
      const href = hrefOf(u)!;
      const hash = href.indexOf("#");
      const url = hash >= 0 ? href.slice(0, hash) : href;
      const id = hash >= 0 ? safeDecode(href.slice(hash + 1)) : "";
      if (!/^https?:/i.test(url)) continue;
      if (!id) {
        // SVG 2 lets `<use>` point at a whole document.
        collector.addRef("object", url);
        continue;
      }
      // Inside a definition, a use is only as used as the definition is: a part
      // of an unused symbol is still fetched (so it can be rebuilt) but counts 0.
      const count = definitionUses(u, symbolUses);
      collector.total += count;
      const entry = sprites.get(url) ?? { url, ids: [], uses: Object.create(null) as Record<string, number> };
      if (!entry.ids.includes(id)) entry.ids.push(id);
      entry.uses[id] = (entry.uses[id] ?? 0) + count;
      sprites.set(url, entry);
    }

    const rendering = renderingChildren(el);

    // A sprite sheet or a defs holder: nothing of its own to show.
    if (rendering.length === 0 || (isHidden(el) && $(el).find("symbol").length > 0)) return;

    if (rendering.every((c) => c.name.toLowerCase() === "use")) {
      if (external.length === rendering.length) return; // shown once its file is read
      if (rendering.length === 1) {
        const id = safeDecode(hrefOf(rendering[0])?.slice(1) ?? "");
        // Already counted in `symbolUses`.
        if (symbolIds.has(id) && isBareSymbolUse(el, rendering[0])) return;
      }
    }

    // XML serialization, not HTML: the result is a standalone .svg file, and
    // HTML output writes `&nbsp;` and `&copy;`, which XML does not define.
    const markup = standalone(selfContained(doc, el, $.xml(el)), doc.namespaces);
    collector.addMarkup("inline", markup, inferElementName($, el));
  });

  $("img").each((_, node) => {
    const el = node as Element;
    const name = el.attribs["alt"]?.trim() || el.attribs["title"]?.trim() || el.attribs["aria-label"]?.trim();
    const candidates = [
      el.attribs["src"],
      el.attribs["data-src"],
      ...srcsetUrls(el.attribs["srcset"]),
      ...srcsetUrls(el.attribs["data-srcset"]),
    ];
    // Per element, by what the page would load: `src="a.svg"` and
    // `data-src="./a.svg"` are one image, not two uses of it.
    const seen = new Set<string>();
    for (const c of candidates) {
      if (!c || !isSvgUrl(c)) continue;
      const ref = absolute(c, base);
      if (!ref || seen.has(ref)) continue;
      seen.add(ref);
      collector.addRef("img", ref, name);
    }
  });

  $("picture source").each((_, node) => {
    const el = node as Element;
    const typed = /svg/i.test(el.attribs["type"] ?? "");
    for (const c of [...srcsetUrls(el.attribs["srcset"]), el.attribs["src"]]) {
      if (!c || !(typed || isSvgUrl(c))) continue;
      const ref = absolute(c, base);
      if (ref) collector.addRef("img", ref);
    }
  });

  $("object[data], embed[src], iframe[src]").each((_, node) => {
    const el = node as Element;
    const raw = el.attribs["data"] ?? el.attribs["src"];
    if (!raw || !(/svg/i.test(el.attribs["type"] ?? "") || isSvgUrl(raw))) return;
    const ref = absolute(raw, base);
    if (ref) collector.addRef("object", ref, el.attribs["title"]?.trim() || el.attribs["aria-label"]?.trim());
  });

  $('link[rel*="icon" i][href]').each((_, node) => {
    const el = node as Element;
    const raw = el.attribs["href"];
    if (!(/svg/i.test(el.attribs["type"] ?? "") || isSvgUrl(raw))) return;
    const ref = absolute(raw, base);
    if (ref) collector.addRef("favicon", ref);
  });

  const cssSources = [
    ...($("style").get() as Element[]).map((el) => $(el).text()),
    ...($("[style]").get() as Element[]).map((el) => el.attribs["style"]),
  ];
  for (const css of cssSources) {
    for (const raw of cssUrls(css)) {
      if (!isSvgUrl(raw)) continue;
      const ref = absolute(raw, base);
      if (ref) collector.addRef("css", ref);
    }
  }
}

export function extractSvgs(
  html: string,
  pageUrl: string,
  options: { maxAssets: number; known?: readonly KnownSvg[] },
): SvgScan {
  const collector = new Collector();
  const sprites = new Map<string, ExternalSprite>();

  // `<template>` contents are already in this tree — cheerio does not split them
  // into a separate fragment — so one pass covers them.
  const $ = cheerio.load(html);
  const baseHref = $("base[href]").first().attr("href");
  const base = (baseHref && resolve(baseHref, pageUrl)) || pageUrl;
  prepareTree($, base);
  scanDocument({ $, base, ids: indexIds($), namespaces: {} }, collector, sprites);

  // SVGs the dig already found in places this scan does not read (Open Graph,
  // JSON-LD, the manifest). Without them the grid could report "none" beside a
  // section that just listed one.
  for (const known of options.known ?? []) {
    const ref = absolute(known.url, base);
    if (!ref) continue;
    const key = /^data:/i.test(ref) ? undefined : "u:" + ref;
    if (key && collector.has(key)) continue;
    collector.addRef("meta", ref, known.name);
  }

  // A symbol nothing on the page uses is still part of the sprite, so it stays,
  // with zero occurrences — the view says "unused" rather than inventing a use.
  const all = collector.values();
  all.sort((a, b) => b.bytes - a.bytes);
  return {
    assets: all.slice(0, options.maxAssets),
    total: collector.total,
    truncated: all.length > options.maxAssets,
    externalSprites: [...sprites.values()],
  };
}

/**
 * Rebuilds the symbols a page used from an external sprite file. Ids the file
 * does not define are left out; the caller decides what that means.
 */
export function rebuildSpriteSymbols(fileText: string, fileUrl: string, uses: Record<string, number>): SvgAsset[] {
  const $ = cheerio.load(fileText, { xml: true });
  absolutizeResources($, fileUrl);
  const root = rootElement($);
  const doc: Doc = { $, base: fileUrl, ids: indexIds($), namespaces: root ? namespacesOf(root) : {} };
  // A `<g>` or `<path>` drawn in the sprite file's coordinates needs that file's
  // viewBox and size, or it lands on the 300×150 default canvas.
  const rootBox = ["viewBox", "width", "height", "preserveAspectRatio"]
    .filter((name) => root?.attribs[name] !== undefined)
    .map((name) => ` ${name}="${escapeAttr(root!.attribs[name])}"`)
    .join("");
  const out: SvgAsset[] = [];
  for (const [id, count] of Object.entries(uses)) {
    const symbol = doc.ids.get(id);
    if (!symbol) continue;
    const markup =
      symbol.name.toLowerCase() === "symbol"
        ? symbolToSvg(doc, symbol)
        : standalone(
            selfContained(doc, symbol, `<svg xmlns="${SVG_NS}"${rootBox}>${$.xml(symbol)}</svg>`),
            doc.namespaces,
          );
    out.push({
      key: "m:" + normalizeMarkup(markup),
      source: "sprite",
      name: id,
      markup,
      url: `${fileUrl}#${encodeURIComponent(id)}`,
      bytes: utf8Bytes(markup),
      occurrences: count,
    });
  }
  return out;
}

/** The root `<svg …>` tag and where it starts, skipping comments and processing instructions that may contain one. */
function findRootTag(markup: string): { tag: string; index: number } | undefined {
  const scanner = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<svg\b[^>]*>/gi;
  for (let m = scanner.exec(markup); m; m = scanner.exec(markup)) {
    if (/^<svg/i.test(m[0])) return { tag: m[0], index: m.index };
  }
  return undefined;
}

/**
 * Grid-tile sources for an SVG, one per appearance.
 *
 * Icons lean on the page for color: `currentColor` inherits CSS `color`, and an
 * unstyled path fills black. Out of the page both render black, which vanishes on
 * a dark tile. The thumbnail supplies a `color` for each theme and, in the dark
 * one, a light default `fill` — but never overrides a fill the author set, and
 * the markup that is copied or exported is untouched.
 *
 * It cannot help a logo whose author hard-coded black (or white) — that is what
 * the preview backdrop is for (see withBackdrop).
 */
export function themedThumbnail(markup: string): { light: string; dark: string } {
  const root = findRootTag(markup);
  if (!root) return { light: svgDataUri(markup), dark: svgDataUri(markup) };
  const { tag, index } = root;
  const hasColor = /\scolor\s*=/i.test(tag);
  const hasFill = /\sfill\s*=/i.test(tag);
  const variant = (color: string, fill?: string) => {
    let extra = "";
    if (!hasColor) extra += ` color="${color}"`;
    if (fill && !hasFill) extra += ` fill="${fill}"`;
    const patched = tag.replace(/^<svg/i, `<svg${extra}`);
    return svgDataUri(markup.slice(0, index) + patched + markup.slice(index + tag.length));
  };
  return { light: variant("#1c1c1e"), dark: variant("#f2f2f7", "#f2f2f7") };
}

/**
 * Preview backdrops, as in Central Icons. `ink` is the color that reads on the
 * backdrop, for artwork that takes its color from the page.
 */
export const BACKDROPS = {
  none: { title: "None", color: null, ink: null },
  white: { title: "White", color: "#FFFFFF", ink: "#000000" },
  black: { title: "Black", color: "#000000", ink: "#FFFFFF" },
  gray: { title: "50% Gray", color: "#808080", ink: "#FFFFFF" },
} as const;

export type Backdrop = keyof typeof BACKDROPS;

export function isBackdrop(value: string | undefined): value is Backdrop {
  return value !== undefined && value in BACKDROPS;
}

/**
 * Canvas side as a multiple of the artwork's longer side. The grid drops its
 * inset when a backdrop is on — an inset would float the backdrop inside the
 * tile instead of filling it — so the canvas grows around the artwork to keep
 * it about the size it is without one.
 */
const BACKDROP_CANVAS = 1.6;

function round(n: number): number {
  return Number(n.toFixed(3));
}

/** The artwork's coordinate box: its viewBox, else its width and height, else the SVG default of 300×150. */
function artworkBox(tag: string): { viewBox: string; width: number; height: number } {
  const vb = /\sviewBox\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
  const parts = vb
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (parts && parts.length === 4 && parts[2] > 0 && parts[3] > 0 && parts.every(Number.isFinite)) {
    return { viewBox: parts.join(" "), width: parts[2], height: parts[3] };
  }
  const dim = (name: string) => Number(new RegExp(`\\s${name}\\s*=\\s*["']([\\d.]+)(?:px)?["']`, "i").exec(tag)?.[1]);
  const width = dim("width") > 0 ? dim("width") : 300;
  const height = dim("height") > 0 ? dim("height") : 150;
  return { viewBox: `0 0 ${width} ${height}`, width, height };
}

/**
 * The SVG on a square backdrop that fills the whole tile — grid preview only;
 * copies, exports and PNGs never get one. Undefined for `none`.
 *
 * The artwork is nested as its own `<svg>`, centered on the canvas at its own
 * aspect ratio, so its viewBox and preserveAspectRatio keep working. Artwork
 * that takes its color from the page — `currentColor`, or no fill at all — gets
 * the backdrop's ink; an author's own colors are left alone, which is the point:
 * a black wordmark on the white backdrop reads, and so does a white one on black.
 */
export function withBackdrop(markup: string, backdrop: Backdrop): string | undefined {
  const { color, ink } = BACKDROPS[backdrop];
  if (!color || !ink) return undefined;
  const root = findRootTag(markup);
  if (!root) return undefined;

  const box = artworkBox(root.tag);
  const side = round(Math.max(box.width, box.height) * BACKDROP_CANVAS);
  const x = round((side - box.width) / 2);
  const y = round((side - box.height) / 2);

  const kept = root.tag
    .replace(/^<svg/i, "")
    .replace(/\s(?:x|y|width|height|viewBox)\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .replace(/\/?>$/, "");
  const defaults =
    (/\scolor\s*=/i.test(kept) ? "" : ` color="${ink}"`) + (/\sfill\s*=/i.test(kept) ? "" : ` fill="${ink}"`);
  const selfClosing = /\/>$/.test(root.tag);
  const innerOpen = `<svg x="${x}" y="${y}" width="${round(box.width)}" height="${round(box.height)}" viewBox="${box.viewBox}"${kept}${defaults}${selfClosing ? "/>" : ">"}`;
  const inner = mapCss(innerOpen + markup.slice(root.index + root.tag.length), (css) =>
    css.replace(/currentColor/g, ink),
  );

  return (
    `<svg xmlns="${SVG_NS}" width="${side}" height="${side}" viewBox="0 0 ${side} ${side}">` +
    `<rect x="0" y="0" width="${side}" height="${side}" fill="${color}"/>${inner}</svg>`
  );
}

/**
 * Markup for Quick Look: `currentColor` resolved to the appearance's ink, so the
 * preview matches the tile it was opened from. Nothing else changes.
 */
export function quickLookMarkup(markup: string, appearance: "light" | "dark"): string {
  const ink = appearance === "dark" ? "#FFFFFF" : "#000000";
  return mapCss(markup, (css) => css.replace(/currentColor/g, ink));
}

/**
 * External sprite symbols joined to the page's own, capped after the join.
 *
 * Pure: every asset is copied before its count changes. The view calls this
 * from a memo, which React may evaluate more than once, and mutating the state
 * it was handed turned "used twice" into "used three times" on the second run.
 */
export function mergeExternalSprites(
  pageAssets: readonly SvgAsset[],
  spriteAssets: readonly SvgAsset[],
  maxAssets: number,
): { assets: SvgAsset[]; truncated: boolean } {
  const byKey = new Map(pageAssets.map((a) => [a.key, { ...a }]));
  for (const s of spriteAssets) {
    const existing = byKey.get(s.key);
    if (existing) existing.occurrences += s.occurrences;
    else byKey.set(s.key, { ...s });
  }
  const all = [...byKey.values()].sort((a, b) => b.bytes - a.bytes);
  return { assets: all.slice(0, maxAssets), truncated: all.length > maxAssets };
}

/**
 * The SVG elements a display copy may keep, by local name, lowercased. Everything
 * else is removed with its contents.
 *
 * An allowlist, because the set of safe SVG elements is closed and the set of
 * dangerous ones is not: every bypass of the earlier blocklist was a spelling it
 * had not anticipated. Seeded from DOMPurify 3.4.16's `svg` and `svgFilters`
 * element lists, with three deliberate differences. `use`, `animate` and `set`
 * are kept — DOMPurify drops them — because sprite icons depend on `<use>` and
 * this copy's reference rules already confine every `href` to an in-file `#id`,
 * while an animation that retargets `href` is removed separately below.
 */
const SVG_ELEMENTS = new Set([
  // DOMPurify svg
  "svg",
  "a",
  "altglyph",
  "altglyphdef",
  "altglyphitem",
  "animatecolor",
  "animatemotion",
  "animatetransform",
  "circle",
  "clippath",
  "defs",
  "desc",
  "ellipse",
  "filter",
  "font",
  "g",
  "glyph",
  "glyphref",
  "hkern",
  "image",
  "line",
  "lineargradient",
  "marker",
  "mask",
  "metadata",
  "mpath",
  "path",
  "pattern",
  "polygon",
  "polyline",
  "radialgradient",
  "rect",
  "stop",
  "style",
  "switch",
  "symbol",
  "text",
  "textpath",
  "title",
  "tref",
  "tspan",
  "view",
  "vkern",
  // DOMPurify svgFilters
  "feblend",
  "fecolormatrix",
  "fecomponenttransfer",
  "fecomposite",
  "feconvolvematrix",
  "fediffuselighting",
  "fedisplacementmap",
  "fedistantlight",
  "fedropshadow",
  "feflood",
  "fefunca",
  "fefuncb",
  "fefuncg",
  "fefuncr",
  "fegaussianblur",
  "feimage",
  "femerge",
  "femergenode",
  "femorphology",
  "feoffset",
  "fepointlight",
  "fespecularlighting",
  "fespotlight",
  "fetile",
  "feturbulence",
  // Kept here, dropped by DOMPurify — see above
  "use",
  "animate",
  "set",
]);

/**
 * An element or attribute name without its namespace prefix, lowercased.
 * `<svg:script>` in the SVG namespace IS a script to a namespace-aware renderer,
 * so every check compares the local part, never the qualified name.
 */
function localName(name: string): string {
  return name.slice(name.lastIndexOf(":") + 1).toLowerCase();
}

/** Nesting depth for SVG data URIs inside SVG data URIs. Past it, the reference is dropped. */
const MAX_DATA_URI_DEPTH = 2;

/**
 * A reference a display copy may keep: an in-file `#id`, a raster data URI, or
 * an SVG data URI — which is itself made display-safe, since it can carry
 * references of its own. Anything else, undefined.
 */
function safeReference(value: string, depth: number): string | undefined {
  const v = value.trim();
  if (v.startsWith("#")) return v;
  if (/^data:image\/svg\+xml/i.test(v)) {
    return depth < MAX_DATA_URI_DEPTH ? displaySafeSvgDataUri(v, depth + 1) : undefined;
  }
  if (/^data:image\//i.test(v)) return v;
  return undefined;
}

/**
 * CSS with every way out of the file removed. Escapes are decoded and comments
 * stripped FIRST, so `u\72l(` and `url/**\/(` are judged as the `url(` a CSS
 * parser would see. Then `@import` goes, a non-local `url()` becomes `none`, and
 * a quoted URL (`image-set("https://…")`, `@font-face` `src`) becomes `""`.
 */
function safeCss(css: string, depth: number): string {
  const decoded = css
    .replace(/\\([0-9a-f]{1,6})\s?/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16) || 0xfffd))
    .replace(/\\([^\n0-9a-f])/gi, "$1")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  return decoded
    .replace(/@import\b[^;]*;?/gi, "")
    .replace(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"]*))\s*\)/gi, (_call: string, dq, sq, bare) => {
      const ref = (dq ?? sq ?? bare ?? "").trim();
      const safe = safeReference(ref, depth);
      if (safe === undefined) return "none";
      // Unchanged references are left exactly as written; only a nested SVG data
      // URI, which has just been rewritten, is re-quoted.
      return safe === ref ? _call : `url("${safe}")`;
    })
    .replace(/(["'])\s*((?:[a-z][\w+.-]*:|\/\/)[^"']*)\1/gi, (_str: string, quote: string, ref: string) => {
      // Same rule as url(): a quoted SVG data URI (`image-set("data:image/svg+xml,…")`)
      // is sanitized like any other nested SVG, a raster one kept, the rest dropped.
      const safe = safeReference(ref, depth);
      return safe !== undefined && !safe.startsWith("#") ? `${quote}${safe}${quote}` : '""';
    });
}

/**
 * A copy of an SVG that is safe to hand to a renderer: no scripts, no event
 * handlers, no embedded documents, and no reference that leaves the file.
 *
 * The network guard checks the request for the SVG itself. It cannot check what
 * the SVG then asks for — `<image href="http://169.254.169.254/…">`, a CSS
 * `url()`, an `@import`, an `<?xml-stylesheet?>` — and whatever renders the file
 * (Raycast's tile renderer, Quick Look's WebKit, AppKit) may fetch those on its
 * own. So every copy that is DISPLAYED goes through here: thumbnails, backdrops,
 * Quick Look, Copy as PNG, guarded image files. Copy and Export keep the original,
 * which is the file the user asked for.
 *
 * Parsed and rebuilt, not filtered with regexes over the text. A regex version
 * lost to parser leniency five ways — unquoted attributes, CSS escapes, a
 * processing instruction, a nested data URI — each a different spelling of the
 * same reference. Parsing makes every spelling the same attribute; only the root
 * element is serialized back, so no prolog, DTD or instruction survives; and only
 * elements on SVG_ELEMENTS are kept.
 */
export function displaySafe(markup: string, depth = 0): string {
  const $ = cheerio.load(markup, { xml: true });
  const root = rootElement($);
  if (!root || root.name.toLowerCase() !== "svg") return `<svg xmlns="${SVG_NS}"/>`;

  // Anything that is not an element or text: instructions, declarations, comments.
  const strip = (node: AnyNode) => {
    if ("children" in node) [...(node.children as AnyNode[])].forEach(strip);
    if (node.type !== "tag" && node.type !== "text" && node.type !== "cdata" && node.type !== "root") {
      $(node).remove();
    }
  };
  strip(root);

  $(root)
    .find("*")
    .toArray()
    .forEach((node) => {
      const el = node as Element;
      const name = localName(el.name);
      const target = localName((el.attribs["attributeName"] ?? el.attribs["attributename"] ?? "").trim());
      if (!SVG_ELEMENTS.has(name) || ((name === "set" || name.startsWith("animate")) && target === "href")) {
        $(el).remove();
      }
    });

  for (const el of [root, ...($(root).find("*").toArray() as Element[])]) {
    for (const [name, value] of Object.entries(el.attribs)) {
      const lname = localName(name);
      if (lname.startsWith("on")) {
        delete el.attribs[name];
      } else if (/(^|:)href$/.test(lname) || lname === "src") {
        const safe = safeReference(value, depth);
        if (safe === undefined) delete el.attribs[name];
        else el.attribs[name] = safe;
      } else if (!NON_CSS_ATTR.test(name)) {
        el.attribs[name] = safeCss(value, depth);
      }
    }
    if (localName(el.name) === "style") $(el).text(safeCss($(el).text(), depth));
  }
  return $.xml(root);
}

/**
 * An SVG data URI made display-safe, or undefined when the URI does not hold an
 * SVG. Raster data URIs have no references to follow and need no such step.
 */
export function displaySafeSvgDataUri(uri: string, depth = 0): string | undefined {
  const markup = decodeSvgDataUri(uri);
  return markup === undefined ? undefined : svgDataUri(displaySafe(markup, depth));
}
