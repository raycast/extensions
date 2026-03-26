const BASE_URL = "https://thesvg.org";

// Search API only returns slug, title, categories, variants (keys)
export interface IconEntry {
  slug: string;
  title: string;
  categories: string[];
  variants: string[];
}

// Detail API returns full data including hex, url, inline SVGs
export interface IconDetail {
  name: string;
  title: string;
  categories: string[];
  hex: string;
  url: string | null;
  variants: Record<
    string,
    {
      url: string;
      svg: string;
    }
  >;
  cdn: {
    jsdelivr: string;
    direct: string;
  };
}

export interface SearchResult {
  total: number;
  count: number;
  limit: number;
  icons: IconEntry[];
}

export interface Category {
  name: string;
  count: number;
}

export async function searchIcons(
  query?: string,
  category?: string,
  limit = 50,
): Promise<SearchResult> {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (category && category !== "all") params.set("category", category);
  params.set("limit", String(limit));

  const res = await fetch(`${BASE_URL}/api/registry?${params}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function getIcon(slug: string): Promise<IconDetail> {
  const res = await fetch(`${BASE_URL}/api/registry/${slug}`);
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`Icon not found: ${slug}`);
    }
    throw new Error(
      `Failed to fetch icon "${slug}": ${res.status} ${res.statusText || ""}`.trim(),
    );
  }
  return res.json();
}

export async function getCategories(): Promise<Category[]> {
  const res = await fetch(`${BASE_URL}/api/categories`);
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
  return `https://cdn.jsdelivr.net/gh/GLINCKER/thesvg@main/public/icons/${slug}/${variant}.svg`;
}
