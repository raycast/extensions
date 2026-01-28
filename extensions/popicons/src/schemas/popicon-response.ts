import { z } from "zod";
import { Popicon } from "./popicon";

export const PopiconResponse = z.object({
  meta: z.object({
    createdAt: z.coerce.date(),
    version: z.string(),
    categories: z.array(z.string()),
  }),
  data: z.array(Popicon),
});

export type PopiconResponse = z.infer<typeof PopiconResponse>;
