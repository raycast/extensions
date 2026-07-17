import { z } from "zod";

export const SAccount = z.object({
  name: z.string(),
  accessToken: z.string().regex(/^[n][p][m]_[A-Za-z0-9]{36}$/),
});
