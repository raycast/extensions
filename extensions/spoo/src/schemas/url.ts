import { z } from "zod";

export const UrlStatus = z.enum(["ACTIVE", "INACTIVE", "EXPIRED", "BLOCKED"]);
export type UrlStatus = z.infer<typeof UrlStatus>;

export const UrlResponseSchema = z.object({
  alias: z.string(),
  short_url: z.string().url(),
  long_url: z.string().url(),
  owner_id: z.string().nullable().optional(),
  created_at: z.union([z.string(), z.number()]),
  status: UrlStatus.optional(),
  private_stats: z.boolean().nullable().optional(),
});
export type UrlResponse = z.infer<typeof UrlResponseSchema>;

export const UrlListItemSchema = z.object({
  id: z.string(),
  alias: z.string().nullable().optional(),
  long_url: z.string().nullable().optional(),
  status: UrlStatus.nullable().optional(),
  created_at: z.string().nullable().optional(),
  expire_after: z.number().nullable().optional(),
  max_clicks: z.number().nullable().optional(),
  private_stats: z.boolean().nullable().optional(),
  block_bots: z.boolean().nullable().optional(),
  password_set: z.boolean().default(false),
  total_clicks: z.number().nullable().optional(),
  last_click: z.string().nullable().optional(),
});
export type UrlListItem = z.infer<typeof UrlListItemSchema> & {
  short_url: string;
};

export const UrlListResponseSchema = z.object({
  items: z.array(UrlListItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  hasNext: z.boolean(),
  sortBy: z.string().optional(),
  sortOrder: z.string().optional(),
});
export type UrlListResponse = Omit<
  z.infer<typeof UrlListResponseSchema>,
  "items"
> & { items: UrlListItem[] };

export const AliasAvailabilitySchema = z.object({
  available: z.boolean(),
  reason: z.enum(["length", "format", "taken"]).nullable(),
});
export type AliasAvailability = z.infer<typeof AliasAvailabilitySchema>;

export const CreateUrlRequestSchema = z.object({
  long_url: z.string().url(),
  alias: z.string().min(3).max(16).optional(),
  password: z.string().min(8).max(128).optional(),
  block_bots: z.boolean().optional(),
  max_clicks: z.number().int().positive().optional(),
  expire_after: z.number().int().positive().optional(),
  private_stats: z.boolean().optional(),
});
export type CreateUrlRequest = z.infer<typeof CreateUrlRequestSchema>;

export const UpdateUrlRequestSchema = CreateUrlRequestSchema.partial().extend({
  status: UrlStatus.optional(),
  password: z.string().min(8).max(128).nullable().optional(),
  max_clicks: z.number().int().min(0).nullable().optional(),
});
export type UpdateUrlRequest = z.infer<typeof UpdateUrlRequestSchema>;
