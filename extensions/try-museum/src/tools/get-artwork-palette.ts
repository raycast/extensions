import { z } from "zod";
import { artworkResult } from "../lib/artworks";
import { getCatalog } from "../lib/catalog";

type Input = {
  /** Exact artwork ID from search-artworks, including the museum prefix, for example nga:998. */
  id: string;
};

export default async function tool(input: Input) {
  const { id } = z.object({ id: z.string().min(1) }).parse(input);
  const catalog = await getCatalog();
  const artwork = catalog.artworks.find((artwork) => artwork.id === id);
  if (!artwork) throw new Error(`Artwork ${id} was not found. Use search-artworks to find a current artwork ID.`);
  return { ...artworkResult(artwork), cachedCatalog: catalog.stale };
}
