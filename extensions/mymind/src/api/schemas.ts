import { z } from "zod";

export function unwrapList<T>(
  itemSchema: z.ZodType<T>,
  data: unknown,
  envelopeKeys: string[] = ["items", "matches", "results", "data"],
): T[] {
  if (Array.isArray(data)) return z.array(itemSchema).parse(data);
  if (data && typeof data === "object") {
    for (const key of envelopeKeys) {
      const value = (data as Record<string, unknown>)[key];
      if (Array.isArray(value)) return z.array(itemSchema).parse(value);
    }
  }
  throw new Error("Unrecognized list response shape");
}

const nullishString = () =>
  z
    .string()
    .nullish()
    .transform((v) => v ?? "");

export const ObjectTagSchema = z.object({
  name: z.string(),
  flags: z.number().nullish(),
});
export type ObjectTag = z.infer<typeof ObjectTagSchema>;

export const ObjectSpaceSchema = z.object({
  id: z.string(),
});
export type ObjectSpace = z.infer<typeof ObjectSpaceSchema>;

export const ObjectSourceSchema = z.object({
  url: z.string(),
});
export type ObjectSource = z.infer<typeof ObjectSourceSchema>;

export const ObjectNoteSchema = z.object({
  id: z.string(),
  content: z.unknown().nullish(),
});
export type ObjectNote = z.infer<typeof ObjectNoteSchema>;

export const PaletteSchema = z
  .object({
    dominantColor: z.string().nullish(),
  })
  .loose();
export type Palette = z.infer<typeof PaletteSchema>;

export const BlobReferenceSchema = z
  .object({
    url: z.string().nullish(),
    name: z.string().nullish(),
    mime: z.string().nullish(),
    size: z.number().nullish(),
    palette: PaletteSchema.nullish(),
  })
  .loose();
export type BlobReference = z.infer<typeof BlobReferenceSchema>;

export const ObjectEntitySchema = z
  .object({
    id: z.string().nullish(),
    name: z.string().nullish(),
    type: z.string().nullish(),
  })
  .loose();
export type ObjectEntity = z.infer<typeof ObjectEntitySchema>;

// API 0.7.0 replaced the `entities` array with a single `mainEntity` whose
// schema.org type lives in `@type`. Loose so the richer per-type fields
// (Book, Movie, Product, Repository, XPost, …) pass through untouched.
export const MainEntitySchema = z
  .object({
    "@type": z.string().nullish(),
    name: z.string().nullish(),
  })
  .loose();
export type MainEntity = z.infer<typeof MainEntitySchema>;

export const LinkEndpointSchema = z
  .object({
    id: z.string(),
  })
  .loose();

export const LinkSchema = z
  .object({
    id: z.string(),
    source: LinkEndpointSchema,
    target: LinkEndpointSchema,
    kind: z.string().nullish(),
  })
  .loose();
export type Link = z.infer<typeof LinkSchema>;

export const MyMindObjectSchema = z.object({
  id: z.string(),
  title: nullishString(),
  // Deprecated by API 0.7.0 in favour of `mainEntity`; kept as a fallback
  // while the old shape is still served in parallel.
  entityType: z.string().nullish(),
  mainEntity: MainEntitySchema.nullish(),
  completed: z.boolean().nullish(),
  summary: z.string().nullish(),
  content: z.unknown().nullish(),
  spaces: z
    .array(ObjectSpaceSchema)
    .nullish()
    .transform((v) => v ?? []),
  tags: z
    .array(ObjectTagSchema)
    .nullish()
    .transform((v) => v ?? []),
  notes: z
    .array(ObjectNoteSchema)
    .nullish()
    .transform((v) => v ?? []),
  entities: z
    .array(ObjectEntitySchema)
    .nullish()
    .transform((v) => v ?? []),
  source: ObjectSourceSchema.nullish(),
  blob: BlobReferenceSchema.nullish(),
  bumped: z.string(),
  created: z.string(),
  modified: z.string(),
  deleted: z.string().nullish(),
});
export type MyMindObject = z.infer<typeof MyMindObjectSchema>;

export const ObjectListSchema = z.array(MyMindObjectSchema);

export const SpaceObjectRefSchema = z.object({
  id: z.string(),
});

export const SpaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().nullish(),
  created: z.string().nullish(),
  objects: z.array(SpaceObjectRefSchema).nullish(),
});
export type Space = z.infer<typeof SpaceSchema>;

export const TagSchema = z.object({
  name: z.string(),
  flags: z.number().nullish(),
});
export type Tag = z.infer<typeof TagSchema>;
