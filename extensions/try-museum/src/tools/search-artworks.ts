import { z } from "zod";
import { artworkResult } from "../lib/artworks";
import { getCatalog } from "../lib/catalog";
import { indexArtworks, parseColor, searchArtworks } from "../lib/colors";

type Input = {
  /** A CSS color: hex (with or without #), color name, rgb(), or hsl(). Must be opaque. */
  color: string;
  /** Maximum number of results, from 1 to 96. Defaults to 12. */
  limit?: number;
};

export default async function tool(input: Input) {
  const { color, limit } = z
    .object({ color: z.string(), limit: z.number().int().min(1).max(96).default(12) })
    .parse(input);
  const hex = parseColor(color);
  if (!hex) throw new Error("Provide an opaque CSS color, such as #1E3A5F, teal, or rgb(30, 58, 95).");
  const catalog = await getCatalog();
  const result = searchArtworks(indexArtworks(catalog.artworks), hex, limit);
  return {
    color: hex,
    closestMatchesOnly: result.closestOnly,
    total: result.total,
    cachedCatalog: catalog.stale,
    artworks: result.results.map(({ artwork, distance }) => ({ ...artworkResult(artwork), colorDistance: distance })),
  };
}
