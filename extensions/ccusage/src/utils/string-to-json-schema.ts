import { z } from "zod";

export const stringToJSON = z.string().transform((str, ctx): unknown => {
  try {
    return JSON.parse(str);
  } catch (e) {
    ctx.addIssue({
      code: "custom",
      message: `Invalid JSON: ${e instanceof Error ? e.message : "Unknown error"}`,
    });
    return z.NEVER;
  }
});
