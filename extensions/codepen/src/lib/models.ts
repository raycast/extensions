import { z } from "zod";

export const accessSchema = z.enum(["Public", "Private", "Protected", "Collaborators"]);
export type Access = z.infer<typeof accessSchema>;
const urlSchema = z.url().refine((value) => ["https:", "http:"].includes(new URL(value).protocol));
const diagnosticSchema = z.object({
  type: z.string(),
  message: z.string(),
  path: z.string().nullish(),
});
export const buildSchema = z.object({
  id: z.string(),
  status: z.enum(["Queued", "Running", "Success", "Failed", "Canceled"]),
  version_id: z.string().nullish(),
  next_id: z.string().nullish(),
  diagnostics: z.array(diagnosticSchema).default([]),
  errors: z.array(diagnosticSchema).default([]),
});
export const fileSchema = z.object({
  id: z.string(),
  path: z.string(),
  name: z.string(),
  is_binary: z.boolean(),
  content: z.string().nullable(),
  url: urlSchema.nullable(),
});
export const versionSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  deployed: z.boolean(),
  preview_url: urlSchema.nullish(),
  build: buildSchema.nullable(),
});
export const versionWithFilesSchema = versionSchema.extend({ files: z.array(fileSchema) });
export const deploymentSchema = z.object({
  id: z.string(),
  version_id: z.string(),
  url: urlSchema,
});
export const penSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  access: accessSchema,
  template: z.boolean(),
  editor: z.enum(["V2", "Classic"]),
  created_at: z.string(),
  updated_at: z.string(),
  urls: z.object({ editor: urlSchema, preview: urlSchema.nullish() }),
  screenshot_urls: z.object({ medium: urlSchema, large: urlSchema }).nullish(),
  saved_version: versionSchema.nullable(),
  deployment: deploymentSchema.nullable(),
});
export const createdPenSchema = penSchema.extend({ build: buildSchema });
export const fileWriteSchema = z.object({
  pen: penSchema,
  version: versionWithFilesSchema,
  build: buildSchema,
});
export const collectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  access: z.enum(["Public", "Private"]),
  items_count: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  url: urlSchema,
});
export const assetSchema = z.object({
  id: z.string(),
  filename: z.string(),
  url: urlSchema,
  is_binary: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  content: z.string().nullish(),
});

export type Pen = z.infer<typeof penSchema>;
export type PenFile = z.infer<typeof fileSchema>;
export type Build = z.infer<typeof buildSchema>;
export type Collection = z.infer<typeof collectionSchema>;
export type Asset = z.infer<typeof assetSchema>;

export const penDetailsSchema = z.object({
  title: z.string().trim().min(1, "Enter a title"),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  access: accessSchema.optional(),
  password: z.string().min(8, "Use at least 8 characters").optional(),
  template: z.boolean().optional(),
});
export type PenDetails = z.infer<typeof penDetailsSchema>;
export type CollectionDetails = { title?: string; description?: string; access?: "Public" | "Private" };
export type TextFileInput = { path: string; content: string };

export function isBuildPending(build: Build | null | undefined): boolean {
  return !!build && (build.status === "Queued" || build.status === "Running" || !!build.next_id);
}

export function buildMessage(build: Build): string {
  if (isBuildPending(build)) return "Files saved. Build is still running; refresh before editing again.";
  if (build.status === "Failed") return "Files saved, but the build failed. Inspect the build diagnostics.";
  if (build.status === "Canceled") return "Files saved, but the compiler needs changes. Open the Pen in CodePen.";
  return "Build succeeded";
}

export function buildIssueLines(build: Build | null | undefined): string[] {
  if (!build) return [];
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const diagnostic of [...build.diagnostics, ...build.errors]) {
    const key = JSON.stringify([diagnostic.message, diagnostic.path ?? null, diagnostic.type]);
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(`- **${diagnostic.type}**${diagnostic.path ? ` (${diagnostic.path})` : ""}: ${diagnostic.message}`);
  }
  return lines;
}
