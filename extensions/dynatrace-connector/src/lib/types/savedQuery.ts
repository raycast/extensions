// src/lib/types/savedQuery.ts
import { z } from "zod";

export const savedQuerySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  dql: z.string().min(10),
  timeframe: z.string(),
  tenantId: z.string().optional(),
  createdAt: z.string(),
  isFavorite: z.boolean(),
});

export type SavedQuery = z.infer<typeof savedQuerySchema>;
