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
    mime: z.string().nullish(),
    size: z.number().nullish(),
    palette: PaletteSchema.nullish(),
  })
  .loose();
export type BlobReference = z.infer<typeof BlobReferenceSchema>;

export const MyMindObjectSchema = z.object({
  id: z.string(),
  title: nullishString(),
  entityType: z.string().nullish(),
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
