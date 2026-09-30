import { z } from "zod";

// Author schema
export const AuthorSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  avatar: z.string().url(),
});

// Item schema
export const ItemSchema = z.object({
  id: z.string().url(),
  url: z.string().url(),
  title: z.string(),
  content_html: z.string(),
  content_text: z.string(),
  date_published: z.coerce.date(),
  date_modified: z.coerce.date(),
  authors: z.array(AuthorSchema),
  tags: z.array(z.string()),
});

// Main feed schema
export const FeedSchema = z.object({
  version: z.string(),
  user_comment: z.string(),
  home_page_url: z.string().url(),
  feed_url: z.string().url(),
  language: z.string(),
  title: z.string(),
  description: z.string(),
  items: z.array(ItemSchema),
});

// Types derived from schemas
export type Author = z.infer<typeof AuthorSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type Feed = z.infer<typeof FeedSchema>;
