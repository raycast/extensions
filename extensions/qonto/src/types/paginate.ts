import { z } from "zod";

export const PaginateSchema = z.object({
  current_page: z.number(),
  next_page: z.number().nullable(),
  prev_page: z.number().nullable(),
  total_pages: z.number(),
  total_count: z.number(),
  per_page: z.number(),
});

export type Paginate = z.infer<typeof PaginateSchema>;
