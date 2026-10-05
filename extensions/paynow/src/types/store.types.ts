import z from "zod";
import { nonEmptyString } from "../schemas/non-empty-string.schema";

export const Store = z.object({
  id: nonEmptyString,
  name: nonEmptyString,
  apiKey: nonEmptyString,
  slug: nonEmptyString,
});
export type Store = z.infer<typeof Store>;
