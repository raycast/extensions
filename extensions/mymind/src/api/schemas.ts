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

export const MyMindObjectSchema = z.object({
  id: z.string(),
  title: nullishString(),
  entityType: z.string().nullish(),
  content: z.unknown().nullish(),
  spaces: z
    .array(ObjectSpaceSchema)
    .nullish()
    .transform((v) => v ?? []),
  tags: z
    .array(ObjectTagSchema)
    .nullish()
    .transform((v) => v ?? []),
  notes: z.array(ObjectNoteSchema).nullish(),
  source: ObjectSourceSchema.nullish(),
  bumped: z.string(),
  created: z.string(),
  modified: z.string(),
  deleted: z.string().nullish(),
});
export type MyMindObject = z.infer<typeof MyMindObjectSchema>;

export const ObjectListSchema = z.array(MyMindObjectSchema);

export const SearchResultSchema = z.object({
  id: z.string(),
  score: z.number(),
  semanticScore: z.number().nullish(),
});
export type SearchResult = z.infer<typeof SearchResultSchema>;

export const SearchResponseSchema = z.object({
  elapsed: z.number().nullish(),
  count: z.number().nullish(),
  query: z.string().nullish(),
  matches: z.array(SearchResultSchema),
});
export type SearchResponse = z.infer<typeof SearchResponseSchema>;

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
export const SpaceListSchema = z.array(SpaceSchema);

export const TagSchema = z.object({
  name: z.string(),
  flags: z.number().nullish(),
});
export type Tag = z.infer<typeof TagSchema>;
export const TagListSchema = z.array(TagSchema);

export const RelatedMatchSchema = z.object({
  id: z.string(),
  score: z.number(),
});
export type RelatedMatch = z.infer<typeof RelatedMatchSchema>;

export const RelatedResponseSchema = z.union([
  z.array(RelatedMatchSchema),
  z.object({ matches: z.array(RelatedMatchSchema) }).loose(),
]);
