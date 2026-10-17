import { BASE, STYLES, parseIconId } from "../api";

type Input = {
  /**
   * One or more icon ids from search-icons, in the form "slug_number" (e.g. "rocket-44_207078"). Max 20.
   */
  ids: string[];
  /**
   * Style of the icons (outline, fill, color-outline, color-fill). Required when the id was not just returned
   * by search-icons in this conversation; otherwise pass the style search-icons reported for that id.
   */
  style?: "outline" | "fill" | "color-outline" | "color-fill";
};

/**
 * Return the ready-to-embed SVG markup for up to 20 Infyicon icon ids returned by search-icons. Use this when the user
 * wants the actual SVG code (to paste into HTML/JSX/Vue or save to a file), not just a link.
 */
export default async function tool(input: Input) {
  const ids = (input.ids ?? [])
    .map((s) => String(s))
    .filter(Boolean)
    .slice(0, 20);
  if (ids.length === 0) return { error: "ids is required (array of slug_number ids from search-icons)" };
  const style = input.style && (STYLES as readonly string[]).includes(input.style) ? input.style : undefined;

  const results = await Promise.all(
    ids.map(async (raw) => {
      const parsed = parseIconId(raw);
      if (!parsed) return { id: raw, error: "invalid id — expected slug_number" };
      const styles = style ? [style] : [...STYLES];
      for (const st of styles) {
        const url = `${BASE}/i2/${st}/svg/${parsed.slug}_${parsed.id}.svg`;
        const res = await fetch(url, { headers: { "User-Agent": "raycast-infyicon" } });
        if (res.ok) {
          const svg = (await res.text()).trim();
          return { id: raw, style: st, page: `${BASE}/free-icon/${parsed.slug}_${parsed.id}`, svg };
        }
      }
      return { id: raw, error: "icon not found" };
    }),
  );

  return {
    icons: results,
    license: "Free for personal & commercial use with attribution to infyicon.com — https://infyicon.com/license",
  };
}
