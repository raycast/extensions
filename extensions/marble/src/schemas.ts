import * as z from "zod";

const optionalString = z
  .string()
  .transform((val) => (val === "" ? undefined : val))
  .optional();

export const categorySchema = z.object({
  name: z.string(),
  slug: z.string(),
  description: optionalString,
});

export const tagSchema = z.object({
  name: z.string(),
  slug: z.string(),
  description: optionalString,
});

export const authorSchema = z.object({
  name: z.string(),
  slug: z.string(),
  bio: optionalString,
  role: optionalString,
  email: optionalString,
  image: optionalString,
});

export const postSchema = z.object({
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  content: z.string(),
  categoryId: z.string(),
  status: z.string(),
  tags: z.array(z.string()),
  authors: z.array(z.string()),
  featured: z.boolean(),
  coverImage: optionalString,
});
