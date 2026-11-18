import { z } from "zod";

const leaderKeyActionBaseSchema = z
  .object({
    key: z.string().min(1, "Key is required"),
    label: z.string().optional(),
    type: z.string(), // Changed from enum to string for maximum compatibility
    value: z.string().optional(),
    iconPath: z.string().optional(),
  })
  .passthrough(); // Allow extra fields without failing validation

export type LeaderKeyAction = z.infer<typeof leaderKeyActionBaseSchema> & {
  actions?: LeaderKeyAction[];
};

export const leaderKeyActionSchema: z.ZodType<LeaderKeyAction> = leaderKeyActionBaseSchema
  .extend({
    actions: z.lazy(() => z.array(leaderKeyActionSchema)).optional(),
  })
  .passthrough();

export const leaderKeyConfigSchema = z
  .object({
    actions: z.array(leaderKeyActionSchema).optional(),
  })
  .passthrough(); // The root of config.json is usually an object with an actions array

export type LeaderKeyConfig = z.infer<typeof leaderKeyConfigSchema>;

export const shortcutItemSchema = z.object({
  alias: z.string().min(1),
  value: z.string().min(1),
  label: z.string().optional(),
  type: z.enum(["application", "url", "command"]),
});

export type ShortcutItem = z.infer<typeof shortcutItemSchema>;
