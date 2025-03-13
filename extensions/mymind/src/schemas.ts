import { z } from "zod";

// Authentication and Preferences
const PreferencesSchema = z.object({
  jwt: z.string(),
  cid: z.string(),
  authenticityToken: z.string(),
});

// Basic building blocks
const TagSchema = z.object({
  id: z.string(),
  name: z.string(),
  flags: z.number().optional(),
});

const SourceSchema = z.object({
  url: z.string(),
});

// Prose-related schemas
const ProseContentSchema = z
  .object({
    type: z.string(),
    content: z.array(z.any()).optional(),
    text: z.string().optional(),
    attrs: z.record(z.any()).optional(),
    marks: z.array(z.object({ type: z.string() })).optional(),
  })
  .or(
    z.object({
      type: z.string(),
      text: z.string(),
    }),
  );

// Manual type definition for ProseContent (needed for recursive schema)
export type ProseContent = {
  type: string;
  content?: ProseContent[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string }>;
};

const ProseContentSchemaRecursive: z.ZodType<ProseContent> = z.lazy(() =>
  z.object({
    type: z.string(),
    content: z.array(ProseContentSchemaRecursive).optional(),
    text: z.string().optional(),
    attrs: z.record(z.unknown()).optional(),
    marks: z.array(z.object({ type: z.string() })).optional(),
  }),
);

const ListItemSchema = z.object({
  content: z
    .array(
      z.object({
        type: z.string(),
        content: z.array(z.object({ text: z.string().optional() })).optional(),
      }),
    )
    .optional(),
  attrs: z.object({ checked: z.boolean().optional() }).optional(),
});

const ProseSchema = z.object({
  type: z.string(),
  content: z.array(ProseContentSchema),
});

// Note-related schemas
const NoteSchema = z.object({
  id: z.string(),
  prose: ProseSchema,
});

const CreateNotePayloadSchema = z.object({
  title: z.string(),
  prose: z.object({
    type: z.literal("doc"),
    content: z.array(ProseContentSchemaRecursive),
  }),
  type: z.literal("Note"),
});

// Card-related schemas
const CardSchema = z.object({
  title: z.string().optional(),
  siteName: z.string().optional(),
  domain: z.string().optional(),
  description: z.string().optional(),
  source: SourceSchema.optional(),
  tags: z.array(TagSchema).optional(),
  flags: z.number().optional(),
  modified: z.string(),
  bumped: z.string(),
  created: z.string(),
  prose: ProseSchema.optional(),
  note: NoteSchema.optional(),
  brand: z.string().optional(),
  ocr: z.string().optional(),
});

// Response schemas
export const MyMindResponseSchema = z.record(CardSchema);

export const CreateNoteResponseSchema = z.object({
  id: z.string(),
  // type: z.enum(["Note", "WebPage", "YouTubeVideo", "Post", "MusicRecording"]), // too many different types and no docs
  type: z.string(),
  title: z.string(),
  created: z.string(),
});

// Type exports
export type Preferences = z.infer<typeof PreferencesSchema>;
export type CardWithSlug = z.infer<typeof CardSchema> & { slug: string };
export type MyMindResponseWithSlugs = Record<string, CardWithSlug>;
export type ListItem = z.infer<typeof ListItemSchema>;
export type CreateNoteResponse = z.infer<typeof CreateNoteResponseSchema>;
export type CreateNotePayload = z.infer<typeof CreateNotePayloadSchema>;
