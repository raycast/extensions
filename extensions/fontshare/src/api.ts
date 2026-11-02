const API_URL = "https://api.fontshare.com/v2";
const PAGE_SIZE = 100;

export const FONTSHARE_URL = "https://www.fontshare.com";

// Subset of the fields returned by the Fontshare API that the extension uses.
interface ApiFont {
  id: string;
  name: string;
  slug: string;
  version: string | null;
  category: string | null;
  story: string | null;
  license_type: string | null;
  languages: string | null;
  inserted_at: string | null;
  designers: { name: string }[] | null;
  publisher: { name: string } | null;
  font_tags: { name: string }[] | null;
  features: { tag: string }[] | null;
  axes: { property: string; range_left: number; range_right: number; range_default: number }[] | null;
  styles: ApiStyle[] | null;
}

interface ApiStyle {
  id: string;
  default: boolean;
  is_italic: boolean;
  is_variable: boolean;
  // Protocol-relative CDN path without extension, e.g. //cdn.fontshare.com/wf/…
  file: string | null;
  // `weight` is the CSS weight (0 for variable styles). `number` identifies the style in CSS and kit URLs
  // (e.g. 401 for Italic, 1 and 2 for Variable and Variable Italic).
  weight: { name: string; number: number; weight: number } | null;
}

// GET /v2/fonts/pairs: the curated pairings shown on fontshare.com (not publicly documented).
interface ApiPair {
  id: string;
  headline_font_family: { id: string; name: string; slug: string };
  headline_font_style: ApiStyle;
  headline_font_size: number;
  headline_text: string;
  body_font_family: { id: string; name: string; slug: string };
  body_font_style: ApiStyle;
  body_font_size: number;
  body_text: string;
}

export interface FontStyle {
  id: string;
  name: string;
  weight: number | null;
  isItalic: boolean;
  isVariable: boolean;
  isDefault: boolean;
}

export interface FontAxis {
  tag: string;
  min: number;
  max: number;
  default: number;
}

export interface Font {
  id: string;
  name: string;
  slug: string;
  url: string;
  version: string | null;
  categories: string[];
  designers: string[];
  publisher: string | null;
  story: string | null;
  license: string | null;
  languages: string | null;
  addedAt: string | null;
  tags: string[];
  features: string[];
  axes: FontAxis[];
  styles: FontStyle[];
  // Static, upright style closest to Regular, used to render the grid preview.
  preview: { styleId: string; woffUrl: string } | null;
}

export interface PairFont {
  familyId: string;
  name: string;
  slug: string;
  url: string;
  styleId: string;
  styleName: string;
  styleCode: number;
  woffUrl: string;
  size: number;
  text: string;
}

export interface FontPair {
  id: string;
  title: string;
  headline: PairFont;
  body: PairFont;
}

const LICENSES: Record<string, string> = {
  itf_ffl: "ITF Free Font License",
  sil_ofl: "SIL Open Font License",
};

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

// The CDN serves each style as .woff2, .woff and .ttf; .woff is the smallest format opentype.js can parse.
function woffUrl(file: string): string {
  return `https:${file}.woff`;
}

function dedupeAxes(axes: NonNullable<ApiFont["axes"]>): FontAxis[] {
  return axes
    .filter((axis, index, all) => all.findIndex((a) => a.property === axis.property) === index)
    .map((axis) => ({
      tag: axis.property,
      min: axis.range_left,
      max: axis.range_right,
      default: axis.range_default,
    }));
}

function previewStyle(styles: ApiStyle[]): ApiStyle | undefined {
  const distance = (style: ApiStyle) => Math.abs((style.weight?.weight ?? 0) - 400);
  const upright = styles
    .filter((style) => style.file && !style.is_italic && !style.is_variable)
    .sort((a, b) => distance(a) - distance(b));
  return upright[0] ?? styles.find((style) => style.file && style.default);
}

function toFont(font: ApiFont): Font {
  const preview = previewStyle(font.styles ?? []);

  return {
    id: font.id,
    name: font.name,
    slug: font.slug,
    url: `${FONTSHARE_URL}/fonts/${font.slug}`,
    version: font.version,
    categories: unique((font.category ?? "").split(",").map((c) => c.trim())),
    designers: unique((font.designers ?? []).map((d) => d.name)),
    publisher: font.publisher?.name ?? null,
    story: font.story,
    license: font.license_type ? (LICENSES[font.license_type] ?? font.license_type) : null,
    languages: font.languages,
    addedAt: font.inserted_at,
    tags: unique((font.font_tags ?? []).map((t) => t.name.trim())),
    features: unique((font.features ?? []).map((f) => f.tag)),
    // Variable fonts with an italic counterpart repeat the same axis, so dedupe by tag. Some static-only families
    // (e.g. RX-100) still list an axis, so ignore axes unless a variable style exists.
    axes: (font.styles ?? []).some((style) => style.is_variable) ? dedupeAxes(font.axes ?? []) : [],
    styles: (font.styles ?? []).map((style) => ({
      id: style.id,
      name: style.weight?.name ?? "Unknown",
      weight: style.weight?.weight || null,
      isItalic: style.is_italic,
      isVariable: style.is_variable,
      isDefault: style.default,
    })),
    preview: preview?.file ? { styleId: preview.id, woffUrl: woffUrl(preview.file) } : null,
  };
}

function toPairFont(
  family: ApiPair["headline_font_family"],
  style: ApiStyle,
  size: number,
  text: string,
): PairFont | null {
  if (!style.file || !style.weight) return null;
  return {
    familyId: family.id,
    name: family.name,
    slug: family.slug,
    url: `${FONTSHARE_URL}/fonts/${family.slug}`,
    styleId: style.id,
    styleName: style.weight.name,
    styleCode: style.weight.number,
    woffUrl: woffUrl(style.file),
    size,
    text: text.trim(),
  };
}

function toPair(pair: ApiPair): FontPair | null {
  const headline = toPairFont(
    pair.headline_font_family,
    pair.headline_font_style,
    pair.headline_font_size,
    pair.headline_text,
  );
  const body = toPairFont(pair.body_font_family, pair.body_font_style, pair.body_font_size, pair.body_text);
  if (!headline || !body) return null;
  // Name the styles when both fonts come from the same family, e.g. "General Sans Semibold + General Sans Regular".
  const title =
    headline.familyId === body.familyId
      ? `${headline.name} ${headline.styleName} + ${body.name} ${body.styleName}`
      : `${headline.name} + ${body.name}`;
  return { id: pair.id, title, headline, body };
}

/** fetch() that turns network failures (offline, DNS…) into a readable message and rejects non-2xx responses. */
export async function fetchFontshare(url: string): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error("Could not reach Fontshare. Check your internet connection.");
  }
  if (!response.ok) {
    throw new Error(`Fontshare responded with ${response.status} ${response.statusText}`);
  }
  return response;
}

async function fetchAll<T>(path: string, key: string): Promise<T[]> {
  const items: T[] = [];
  let offset = 0;

  for (;;) {
    const response = await fetchFontshare(`${API_URL}${path}?limit=${PAGE_SIZE}&offset=${offset}`);

    const data = (await response.json()) as { has_more: boolean } & Record<string, T[]>;
    const page = data[key] ?? [];
    items.push(...page);

    if (!data.has_more || page.length === 0) {
      return items;
    }
    offset += page.length;
  }
}

export async function fetchFonts(): Promise<Font[]> {
  return (await fetchAll<ApiFont>("/fonts", "fonts")).map(toFont);
}

export async function fetchPairs(): Promise<FontPair[]> {
  return (await fetchAll<ApiPair>("/fonts/pairs", "font_pairs")).flatMap((pair) => toPair(pair) ?? []);
}

/** Extra search terms for a font, beyond its name. */
export function fontKeywords(font: Font): string[] {
  return [...font.designers, ...font.categories, ...font.tags, ...(font.publisher ? [font.publisher] : [])];
}

// A font spec is a family slug, optionally restricted to styles: "satoshi" or "satoshi@400,401".
export function fontSpec(slug: string, styleCodes: number[] = []): string {
  return styleCodes.length > 0 ? `${slug}@${styleCodes.join(",")}` : slug;
}

function specsQuery(specs: string[]): string {
  return specs.map((spec) => `f[]=${spec}`).join("&");
}

export function cssUrl(specs: string[]): string {
  return `${API_URL}/css?${specsQuery(specs)}&display=swap`;
}

export function familyDownloadUrl(slug: string): string {
  return `${API_URL}/fonts/download/${slug}`;
}

export function kitDownloadUrl(specs: string[]): string {
  return `${API_URL}/fonts/download/kit?${specsQuery(specs)}`;
}

// Same fallback rule as fontshare.com's CSS snippet.
export function genericFamily(categories: string[]): string {
  for (const category of categories.map((c) => c.toLowerCase())) {
    if (["handwritten", "script"].includes(category)) return "cursive";
    if (["sans", "slab", "display"].includes(category)) return "sans-serif";
  }
  return "serif";
}
