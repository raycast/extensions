export const BASE = "https://infyicon.com";
export const STYLES = ["outline", "fill", "color-outline", "color-fill"] as const;
export type Style = (typeof STYLES)[number];
export const PAGE_SIZE = 60;
export const ATTRIBUTION = "Free with attribution to infyicon.com — https://infyicon.com/license";

export type Icon = {
  id: number;
  slug: string;
  style: Style;
  name: string;
  tags: string[];
};

export type SearchResponse = {
  v2?: Icon[];
  items?: Icon[];
  total?: number;
  hasMore?: boolean;
  off?: number;
  size?: number;
  corrected?: string | null;
};

export function iconKey(icon: Pick<Icon, "slug" | "id">) {
  return `${icon.slug}_${icon.id}`;
}

export function pageUrl(icon: Icon) {
  return `${BASE}/free-icon/${iconKey(icon)}`;
}

export function svgUrl(icon: Icon) {
  return `${BASE}/i2/${icon.style}/svg/${iconKey(icon)}.svg`;
}

export function pngUrl(icon: Icon, size: number | string = 512) {
  return `${BASE}/i2/${icon.style}/png/${size}/${iconKey(icon)}.png`;
}

export function styleLabel(style: string) {
  return style.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function searchUrl(query: string, style: string, offset: number, size = PAGE_SIZE) {
  const params = new URLSearchParams({ q: query, off: String(offset), size: String(size) });
  if (style) params.set("style", style);
  return `${BASE}/api/search?${params.toString()}`;
}

export function listUrl(style: string, page: number, size = PAGE_SIZE) {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (style) params.set("style", style);
  return `${BASE}/api/list?${params.toString()}`;
}

/** Parse "slug_123" (as returned by the MCP server / AI tools) back into slug + id. */
export function parseIconId(id: string): { slug: string; id: number } | null {
  const m = /^(.*)_(\d+)$/.exec(id.trim());
  if (!m) return null;
  return { slug: m[1], id: Number(m[2]) };
}

export async function fetchSvg(icon: Icon): Promise<string> {
  const res = await fetch(svgUrl(icon), { headers: { "User-Agent": "raycast-infyicon" } });
  if (!res.ok) throw new Error(`SVG not available (${res.status})`);
  return (await res.text()).trim();
}

/** Minimal SVG → JSX: camelCase attributes, class → className, drop XML comment/prolog. */
export function svgToJsx(svg: string): string {
  return svg
    .replace(/<\?xml[^>]*\?>\s*/g, "")
    .replace(/<!--[\s\S]*?-->\s*/g, "")
    .replace(/\sxml:space="[^"]*"/g, "")
    .replace(/\sclass=/g, " className=")
    .replace(
      /\s([a-z]+)-([a-z])([a-z-]*)=/g,
      (_m, a: string, b: string, c: string) =>
        ` ${a}${b.toUpperCase()}${c.replace(/-([a-z])/g, (_x, d: string) => d.toUpperCase())}=`,
    )
    .replace(/\sstyle="([^"]*)"/g, (_m, css: string) => {
      const obj = css
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((rule) => {
          const [k, ...v] = rule.split(":");
          const key = k.trim().replace(/-([a-z])/g, (_x, d: string) => d.toUpperCase());
          return `${key}: "${v.join(":").trim()}"`;
        })
        .join(", ");
      return ` style={{ ${obj} }}`;
    });
}
