import { Icon, SearchResponse, STYLES, iconKey, pageUrl, pngUrl, searchUrl, svgUrl } from "../api";

type Input = {
  /**
   * What to search for, e.g. "shopping cart", "doctor", "rocket". 1–4 plain words work best.
   */
  query: string;
  /**
   * Optional style filter: "outline" (black line), "fill" (black solid), "color-outline" or "color-fill".
   * Omit to get all four styles mixed.
   */
  style?: "outline" | "fill" | "color-outline" | "color-fill";
  /**
   * Max results to return (default 8, max 30).
   */
  limit?: number;
};

/**
 * Search Infyicon's 161,000+ free vector icons by keyword. Returns icon ids (slug_number), names, styles,
 * icon page URLs, direct SVG/PNG URLs and tags. Call this first whenever the user describes an icon they need,
 * then pass ids to get-icon-svg for embeddable markup. Icons are free with attribution to infyicon.com.
 */
export default async function tool(input: Input) {
  const query = (input.query ?? "").trim();
  if (!query) return { error: "query is required" };
  const style = input.style && (STYLES as readonly string[]).includes(input.style) ? input.style : "";
  const limit = Math.max(1, Math.min(30, Number(input.limit) || 8));
  const res = await fetch(searchUrl(query, style, 0, limit), { headers: { "User-Agent": "raycast-infyicon" } });
  if (!res.ok) return { error: `Infyicon search failed (HTTP ${res.status})` };
  const json = (await res.json()) as SearchResponse;
  const icons: Icon[] = json.v2 ?? json.items ?? [];
  return {
    query,
    style: style || "all",
    total_matches: json.total ?? icons.length,
    icons: icons.map((icon) => ({
      id: iconKey(icon),
      name: icon.name,
      style: icon.style,
      page: pageUrl(icon),
      svg_url: svgUrl(icon),
      png_512: pngUrl(icon, 512),
      tags: icon.tags ?? [],
    })),
    license: "Free for personal & commercial use with attribution to infyicon.com — https://infyicon.com/license",
  };
}
