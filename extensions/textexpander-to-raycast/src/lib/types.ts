import { z } from "zod";

const snippetKindSchema = z.enum(["plain", "rich", "applescript", "shell", "unknown"]);
export type SnippetKind = z.infer<typeof snippetKindSchema>;

export interface SourceSnippet {
  id: string;
  group: string;
  label: string;
  abbreviation: string;
  text: string;
  kind: SnippetKind;
  sourcePath?: string;
}

export interface Library {
  snippets: SourceSnippet[];
  suggestedCount: number;
}

export const raycastSnippetSchema = z.object({
  name: z.string().min(1),
  text: z.string().min(1),
  keyword: z.string().optional(),
});
export type RaycastSnippet = z.infer<typeof raycastSnippetSchema>;

const warningSchema = z.object({
  code: z.enum([
    "rich",
    "script",
    "unknown",
    "macro",
    "placeholder",
    "no-keyword",
    "invalid-keyword",
    "keyword-conflict",
    "existing-conflict",
  ]),
  level: z.enum(["warning", "info"]),
  message: z.string(),
});
export type ReviewWarning = z.infer<typeof warningSchema>;

const previewSnippetSchema = z.object({
  id: z.string(),
  group: z.string(),
  kind: snippetKindSchema,
  sourcePath: z.string().optional(),
  original: raycastSnippetSchema,
  snippet: raycastSnippetSchema,
  changes: z.array(z.string()),
  warnings: z.array(warningSchema),
});
export type PreviewSnippet = z.infer<typeof previewSnippetSchema>;
const countSchema = z.number().int().nonnegative();
const conversionSchema = z.object({
  snippets: z.array(previewSnippetSchema),
  suggestedCount: countSchema,
  duplicateCount: countSchema,
  emptyCount: countSchema,
  skipped: z.array(
    z.object({
      id: z.string(),
      group: z.string(),
      name: z.string(),
      sourcePath: z.string().optional(),
      reason: z.enum(["empty", "duplicate"]),
    }),
  ),
});
export type Conversion = z.infer<typeof conversionSchema>;

export const migrationSessionSchema = z.object({
  version: z.literal(1),
  createdAt: z.string(),
  prefixGroups: z.boolean(),
  sources: z.array(z.object({ path: z.string(), snippetCount: countSchema, suggestedCount: countSchema })),
  conversion: conversionSchema,
  selectedIds: z.array(z.string()),
  edits: z.record(z.string(), raycastSnippetSchema),
  groupNames: z.record(z.string(), z.string()),
  existing: z.array(raycastSnippetSchema),
  referencePath: z.string().optional(),
});
export type MigrationSession = z.infer<typeof migrationSessionSchema>;
