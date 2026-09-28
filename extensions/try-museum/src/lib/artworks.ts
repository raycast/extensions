import { z } from "zod";

export const MUSEUM_URL = "https://trymuseum.com";
export const IMAGE_BASE_URL = "https://media.trymuseum.com/";

const relativePath = z
  .string()
  .regex(/^[a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+$/)
  .refine((path) => !path.startsWith("/"));
export const manifestSchema = z
  .object({
    total: z.number().int().nonnegative(),
    batches: z.array(
      z.object({ file: z.string().regex(/^batch-[\w-]+\.json$/), count: z.number().int().nonnegative() }),
    ),
  })
  .refine(
    (manifest) => new Set(manifest.batches.map((batch) => batch.file)).size === manifest.batches.length,
    "Duplicate catalog batches",
  );
export const artworkSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  artist: z.string().nullable(),
  date: z.string().nullable(),
  sourceUrl: z.url().refine((url) => new URL(url).protocol === "https:"),
  image: z.object({ key: relativePath, width: z.number().positive(), height: z.number().positive() }),
  palette: z.array(z.object({ hex: z.string().regex(/^#[\da-f]{6}$/i), share: z.number().min(0).max(100) })).min(1),
});
export const batchSchema = z.array(artworkSchema);
export type Artwork = z.infer<typeof artworkSchema>;
export type Manifest = z.infer<typeof manifestSchema>;

const museums: Record<string, string> = {
  cleveland: "Cleveland Museum of Art",
  nga: "National Gallery of Art",
  met: "The Metropolitan Museum of Art",
  artic: "Art Institute of Chicago",
  saam: "Smithsonian American Art Museum",
};

export function museumName(artwork: Artwork): string {
  return museums[artwork.id.split(":")[0]] ?? new URL(artwork.sourceUrl).hostname;
}

export function imageUrl(artwork: Artwork): string {
  return new URL(artwork.image.key, IMAGE_BASE_URL).href;
}

export function attribution(artwork: Artwork): string {
  return `${[artwork.title, artwork.artist, artwork.date].filter(Boolean).join(", ")}. Source: ${museumName(artwork)}. ${artwork.sourceUrl}`;
}

export function artworkResult(artwork: Artwork) {
  return {
    id: artwork.id,
    title: artwork.title,
    artist: artwork.artist,
    date: artwork.date,
    museum: museumName(artwork),
    sourceUrl: artwork.sourceUrl,
    imageUrl: imageUrl(artwork),
    palette: artwork.palette,
  };
}
