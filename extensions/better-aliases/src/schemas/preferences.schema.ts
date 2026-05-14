import { z } from "zod";

export const preferencesSchema = z.object({
  leaderKeyConfigPath: z.string().optional(),
  betterAliasesConfigPath: z.string().optional(),
  hideAccessories: z.boolean().optional().default(false),
  snippetPrefix: z.string().optional().default(","),
  randomizedSnippetSeparator: z.string().optional().default(";;"),
  showFullAlias: z.boolean().optional().default(false),
});

export const expandAliasPreferencesSchema = preferencesSchema.extend({
  showFullAlias: z.boolean(),
});

export type Preferences = z.infer<typeof preferencesSchema>;
export type ExpandAliasPreferences = z.infer<typeof expandAliasPreferencesSchema>;
