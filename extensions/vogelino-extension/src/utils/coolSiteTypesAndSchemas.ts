import { z } from "zod";

export const coolSiteSchema = z.object({
  id: z.string(),
  title: z.string().trim().min(1),
  url: z.string().url(),
  thumbnail: z.string().url().optional().nullable(),
  favicon: z.string().url().optional().nullable(),
  date: z.string(),
  tags: z.string().array().default([]),
});
export type CoolSiteType = z.infer<typeof coolSiteSchema>;

export const coolSiteInsertSchema = z.object({
  name: z.string().trim().min(1, "Enter a name."),
  url: z.string().trim().url("Enter a valid URL."),
  tags: z.string().array().default([]),
});
export type CoolSiteInsertType = z.infer<typeof coolSiteInsertSchema>;
