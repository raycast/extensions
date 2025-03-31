import { z } from "zod";

export const compressImageResponseScheme = z.object({
  output: z.object({
    size: z.number(),
    url: z.string(),
  }),
  error: z.string().optional(),
  message: z.string().optional(),
});
