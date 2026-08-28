import { z } from "zod";

const nullishString = () =>
  z
    .string()
    .nullish()
    .transform((value) => value ?? undefined);
const nullishNumber = () =>
  z
    .number()
    .nullish()
    .transform((value) => value ?? undefined);
const nullishObject = <T extends z.ZodTypeAny>(schema: T) => schema.nullish().transform((value) => value ?? undefined);
const nullishArray = <T extends z.ZodTypeAny>(schema: T) =>
  z
    .array(schema)
    .nullish()
    .transform((value) => value ?? undefined);
const nullishStringOrStringArray = () =>
  z
    .union([z.string(), z.array(z.string())])
    .nullish()
    .transform((value) => value ?? undefined);

export const PreferencesSchema = z.object({
  accessKeyId: z.string().min(1),
  accessKeySecret: z.string().min(1),
  accessLevel: z.enum(["read-only", "full-access"]),
});

export const TagSchema = z.object({
  id: nullishString(),
  name: z.string(),
  flags: nullishNumber(),
  count: nullishNumber(),
  modified: nullishString(),
});

export const SpaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: nullishString(),
  created: nullishString(),
});

export const LinkSchema = z.object({
  id: z.string(),
  type: z.string(),
  sourceId: z.string(),
  targetId: z.string(),
  flags: nullishNumber(),
});

export const ContentSchema = z.object({
  type: z.string(),
  body: z.union([z.string(), z.record(z.any())]),
});

export const BlobReferenceSchema = z.object({
  path: nullishString(),
  type: nullishString(),
  url: nullishString(),
  width: nullishNumber(),
  height: nullishNumber(),
});

export const NoteSchema = z.object({
  id: z.string(),
  content: nullishObject(ContentSchema),
});

export const MainEntitySchema = z
  .object({
    "@type": nullishStringOrStringArray(),
    "@id": nullishString(),
    name: nullishString(),
    headline: nullishString(),
    title: nullishString(),
    description: nullishString(),
    url: nullishString(),
  })
  .passthrough();

export const MyMindObjectSchema = z.object({
  id: z.string(),
  title: nullishString(),
  url: nullishString(),
  source: nullishObject(
    z.object({
      url: nullishString(),
    }),
  ),
  content: nullishObject(ContentSchema),
  blob: nullishObject(BlobReferenceSchema),
  screenshot: nullishObject(BlobReferenceSchema),
  mainEntity: nullishObject(MainEntitySchema),
  summary: nullishString(),
  tags: z
    .array(TagSchema)
    .nullish()
    .transform((value) => value ?? []),
  spaces: nullishArray(SpaceSchema.pick({ id: true })),
  notes: nullishArray(NoteSchema),
  created: z.string(),
  modified: z.string(),
  bumped: z.string(),
  deleted: nullishString(),
});

export const ApiProblemSchema = z.object({
  type: z.string(),
  status: z.number(),
  detail: z.string(),
});

export type ParsedPreferences = z.output<typeof PreferencesSchema>;
export type Tag = z.infer<typeof TagSchema>;
export type Space = z.infer<typeof SpaceSchema>;
export type Link = z.infer<typeof LinkSchema>;
export type Content = z.infer<typeof ContentSchema>;
export type MainEntity = z.infer<typeof MainEntitySchema>;
export type MyMindObject = z.infer<typeof MyMindObjectSchema>;
export type ApiProblem = z.infer<typeof ApiProblemSchema>;
