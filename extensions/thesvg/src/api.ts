const BASE_URL = "https://thesvg.org";

export interface Preferences {
  defaultVariant: string;
}

export interface IconEntry {
  slug: string;
  title: string;
  aliases: string[];
  categories: string[];
  hex: string;
  url: string | null;
  variants: string[];
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
    jsdelivr: string;
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
let registryPromise: Promise<RegistryResponse> | null = null;

async function fetchRegistry(): Promise<RegistryResponse> {
  if (cachedRegistry) return cachedRegistry;
  if (!registryPromise) {
    registryPromise = fetch(`${BASE_URL}/api/registry.json`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = (await res.json()) as RegistryResponse;
        cachedRegistry = data;
        return data;
      })
      .catch((err) => {
        registryPromise = null;
        throw err;
      });
  }
  return registryPromise;
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
    total: data.total,
    icons: filtered.slice(0, limit),
  };
}

async function fetchSvg(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) return "";
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
      jsdelivr: getCdnUrl(slug),
      direct: getIconUrl(slug),
    },
  };
}

export async function getCategories(): Promise<Category[]> {
  const res = await fetch(`${BASE_URL}/api/categories.json`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data: { categories: Category[] } = await res.json();
  return data.categories;
}

export function getIconUrl(slug: string, variant = "default"): string {
  return `${BASE_URL}/icons/${slug}/${variant}.svg`;
}

export function getIconPageUrl(slug: string): string {
  return `${BASE_URL}/icon/${slug}`;
}

export function getCdnUrl(slug: string, variant = "default"): string {
  return `https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/${slug}/${variant}.svg`;
}

// --- Copy format helpers ---

function toPascalCase(str: string): string {
  const pascal = str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(.)/, (_, c: string) => c.toUpperCase());
  return /^\d/.test(pascal) ? `_${pascal}` : pascal;
}

function svgToJsxAttrs(svg: string): string {
  return (
    svg
      .replace(/\bclass="/g, 'className="')
      .replace(/\bxmlns="[^"]*"/g, "")
      // Replace only hyphenated attribute names (immediately before `=`),
      // leaving attribute values (e.g. font-family="sans-serif") intact.
      .replace(/\b([a-z]+(?:-[a-z]+)+)(?=\s*=)/g, (match) =>
        match.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()),
      )
  );
}

export function toJsx(svg: string, componentName: string): string {
  const name = toPascalCase(componentName);
  const jsxSvg = svgToJsxAttrs(svg);
  return `export function ${name}Icon(props) {\n  return (\n    ${jsxSvg.replace(/<svg/, "<svg {...props}")}\n  );\n}`;
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
