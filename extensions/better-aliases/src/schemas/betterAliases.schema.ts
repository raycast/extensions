import { z } from "zod";

export const betterAliasItemSchema = z
  .object({
    value: z.string().min(1, "Value cannot be empty"),
    label: z.string().optional(),
    snippetOnly: z.preprocess((val) => {
      if (typeof val === "string") return val.toLowerCase() === "true";
      return val;
    }, z.boolean().optional().default(false)),
  })
  .passthrough(); // Allow extra fields used by other systems

export const betterAliasesConfigSchema = z.record(
  z.string().min(1, "Alias key cannot be empty"),
  betterAliasItemSchema,
);

export type BetterAliasItem = z.infer<typeof betterAliasItemSchema>;
export type BetterAliasesConfig = z.infer<typeof betterAliasesConfigSchema>;
