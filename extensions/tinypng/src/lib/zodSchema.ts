import { z } from "zod";

export const compressImageResponseScheme = z.union([
  z.object({
    output: z.object({
      size: z.number(),
      url: z.string(),
    }),
  }),
  z.object({
    error: z.string(),
    message: z.string(),
  }),
]);
