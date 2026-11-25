import generate from "@babel/generator";
import * as t from "@babel/types";
import toBabelAST from "@svgr/hast-util-to-babel-ast";
import { parse } from "svg-parser";

const BASE_URL = "https://www.iconpik.com";

export interface IconEntry {
  slug: string;
  title: string;
  aliases: string[];
  categories: string[];
  hex: string;
  url: string | null;
  variants: string[];
  variantPaths: Record<string, string>;
}

export interface IconDetail {
  slug: string;
  title: string;
  aliases: string[];
  categories: string[];
  hex: string;
  url: string | null;
  variants: Record<string, { url: string; svg: string }>;
  cdn: {
    hosted: string;
    direct: string;
  };
}

interface RegistryResponse {
  total: number;
  icons: IconEntry[];
}

export interface SearchResult {
  total: number;
  icons: IconEntry[];
}

export interface Category {
  name: string;
  count: number;
}

let cachedRegistry: RegistryResponse | null = null;
const variantPathsBySlug = new Map<string, Record<string, string>>();

async function fetchRegistry(): Promise<RegistryResponse> {
  if (cachedRegistry) return cachedRegistry;
  const res = await fetch(`${BASE_URL}/api/icons-full.json`, {
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const raw = (await res.json()) as Array<
    Omit<IconEntry, "variants" | "variantPaths"> & {
      variants: Record<string, string>;
    }
  >;
  cachedRegistry = {
    total: raw.length,
    icons: raw.map((icon) => {
      variantPathsBySlug.set(icon.slug, icon.variants);
      return {
        ...icon,
        variants: Object.keys(icon.variants),
        variantPaths: icon.variants,
      };
    }),
  };
  return cachedRegistry;
}

export async function searchIcons(
  query?: string,
  category?: string,
  limit = 50,
): Promise<SearchResult> {
  const data = await fetchRegistry();
  let filtered = data.icons;

  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(
      (icon) =>
        icon.title.toLowerCase().includes(q) ||
        icon.slug.toLowerCase().includes(q) ||
        icon.aliases.some((a) => a.toLowerCase().includes(q)) ||
        icon.categories.some((c) => c.toLowerCase().includes(q)),
    );
  }

  if (category && category !== "all") {
    const cat = category.toLowerCase();
    filtered = filtered.filter((icon) =>
      icon.categories.some((c) => c.toLowerCase() === cat),
    );
  }

  return {
    total: filtered.length,
    icons: filtered.slice(0, limit),
  };
}

async function fetchSvg(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`Could not fetch SVG: ${res.status}`);
  return res.text();
}

export async function getIcon(slug: string): Promise<IconDetail> {
  const data = await fetchRegistry();
  const entry = data.icons.find((i) => i.slug === slug);
  if (!entry) throw new Error(`Icon not found: ${slug}`);

  // Fetch SVG content for all variants in parallel
  const variantEntries = await Promise.all(
    entry.variants.map(async (v) => {
      const url = getIconUrl(slug, v);
      const svg = await fetchSvg(url);
      return [v, { url, svg }] as const;
    }),
  );

  return {
    slug: entry.slug,
    title: entry.title,
    aliases: entry.aliases,
    categories: entry.categories,
    hex: entry.hex,
    url: entry.url,
    variants: Object.fromEntries(variantEntries),
    cdn: {
      hosted: getCdnUrl(slug),
      direct: getIconUrl(slug),
    },
  };
}

export async function getCategories(): Promise<Category[]> {
  const res = await fetch(`${BASE_URL}/api/categories.json`, {
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = (await res.json()) as { categories: Category[] };
  return data.categories;
}

export function getIconUrl(slug: string, variant = "default"): string {
  const path = variantPathsBySlug.get(slug)?.[variant];
  return path
    ? `${BASE_URL}${path}`
    : `${BASE_URL}/icons/${slug}/${variant}.svg`;
}

export function getIconPageUrl(slug: string): string {
  return `${BASE_URL}/icon/${slug}`;
}

export function getCdnUrl(slug: string, variant = "default"): string {
  return getIconUrl(slug, variant);
}

// --- Copy format helpers ---

function toPascalCase(str: string): string {
  const name = str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(.)/, (_, c: string) => c.toUpperCase());
  return /^\d/.test(name) ? `_${name}` : name || "Brand";
}

export function toJsx(svg: string, componentName: string): string {
  const ast = toBabelAST(parse(svg));
  const statement = ast.body[0];
  if (
    !t.isExpressionStatement(statement) ||
    !t.isJSXElement(statement.expression)
  ) {
    throw new Error("SVG does not contain a root element");
  }
  const element = statement.expression;
  element.openingElement.attributes.push(
    t.jsxSpreadAttribute(t.identifier("props")),
  );
  const component = t.functionDeclaration(
    t.identifier(`${toPascalCase(componentName)}Icon`),
    [t.identifier("props")],
    t.blockStatement([t.returnStatement(element)]),
  );
  return generate(t.program([t.exportNamedDeclaration(component)])).code;
}

export function toHtmlImg(slug: string, title: string): string {
  const url = getIconUrl(slug);
  return `<img src="${url}" alt="${title}" width="24" height="24" />`;
}

export function toDataUri(svg: string): string {
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, "%27")
    .replace(/"/g, "%22");
  return `data:image/svg+xml,${encoded}`;
}
