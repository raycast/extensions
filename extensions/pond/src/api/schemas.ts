import { z } from "zod";

// Adapted from Pond's packages/schema/src/local-api.ts at v1.0.1.
// See THIRD_PARTY_NOTICES.md for the upstream license.
export const cursorSchema = z.object({
  value: z.union([z.string(), z.number(), z.null()]),
  id: z.string(),
  libraryId: z.string(),
  revision: z.number(),
  sortSignature: z.string().optional(),
});

export const queryPageSchema = z.object({
  ids: z.array(z.string()),
  total: z.number(),
  nextCursor: cursorSchema.nullable(),
  libraryId: z.string(),
  revision: z.number(),
});

export const saveSchema = z.object({
  id: z.string(),
  source: z.string(),
  url: z.url(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  author: z.string().nullable(),
  tags: z.array(z.string()),
  savedAt: z.union([z.string(), z.number()]),
});

export const librarySchema = z.object({
  path: z.string(),
  name: z.string(),
  active: z.boolean(),
  available: z.boolean(),
  lastOpened: z.number(),
  icon: z.string().nullable(),
  accent: z.string().nullable(),
});

export const enqueueResultSchema = z.object({ id: z.string(), created: z.boolean() });
export const switchResultSchema = z.object({ ok: z.literal(true), path: z.string() });

export const appInfoSchema = z.object({
  name: z.literal("pond"),
  version: z.string(),
  platform: z.string(),
  arch: z.string(),
});

export const libraryInfoSchema = z.object({
  path: z.string(),
  name: z.string(),
  counts: z.object({ active: z.number() }),
});

export const operationPreviewSchema = z.object({
  token: z.string(),
  operation: z.string(),
  libraryId: z.string(),
  expiresAt: z.number(),
});

export const copyFileResultSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), reason: z.string().optional() }),
]);

export type PondCursor = z.infer<typeof cursorSchema>;
export type PondSave = z.infer<typeof saveSchema>;
export type PondLibrary = z.infer<typeof librarySchema>;
