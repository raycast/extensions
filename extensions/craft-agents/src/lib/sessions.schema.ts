import { z } from "zod";

/**
 * Best-effort schema for the first line of `session.jsonl`.
 *
 * Craft Agents does not publish an official schema; fields observed in practice
 * are modeled here as optional + `.passthrough()` so unknown fields are retained.
 * See docs/tech-debt.md TD-001.
 */
export const SessionMetaSchema = z
  .object({
    sessionId: z.string().optional(),
    name: z.string().optional(),
    title: z.string().optional(),
    labels: z.array(z.string()).optional(),
    sessionStatus: z.string().optional(),
    flagged: z.boolean().optional(),
    createdAt: z.union([z.string(), z.number()]).optional(),
    updatedAt: z.union([z.string(), z.number()]).optional(),
  })
  .passthrough();
export type SessionMeta = z.infer<typeof SessionMetaSchema>;

/**
 * Normalized record produced by the reader, joining folder name (authoritative id)
 * with the best available metadata.
 */
export interface SessionRecord {
  id: string;
  displayName: string;
  labels: string[];
  status?: string;
  flagged: boolean;
  updatedAt?: Date;
}
