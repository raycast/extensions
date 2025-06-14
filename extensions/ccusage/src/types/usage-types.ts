import { z } from "zod";

// Base schemas
const DailyUsageDataSchema = z.object({
  date: z.string(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheCreationTokens: z.number().optional(),
  cacheReadTokens: z.number().optional(),
  totalTokens: z.number(),
  totalCost: z.number().optional(),
  cost: z.number(), // For compatibility, derived from totalCost
});

const SessionDataSchema = z.object({
  sessionId: z.string(),
  projectPath: z.string(),
  lastActivity: z.string(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheCreationTokens: z.number().optional(),
  cacheReadTokens: z.number().optional(),
  totalTokens: z.number(),
  totalCost: z.number(),
  cost: z.number(), // Alias for totalCost for compatibility
  modelsUsed: z.array(z.string()).optional(), // From ccusage
  modelBreakdowns: z
    .array(
      z.object({
        modelName: z.string(), // ccusage uses modelName, not model
        inputTokens: z.number(),
        outputTokens: z.number(),
        cacheCreationTokens: z.number().optional(),
        cacheReadTokens: z.number().optional(),
        cost: z.number(),
      }),
    )
    .optional(),
  model: z.string().optional(), // Derived field for UI compatibility
  startTime: z.string().optional(), // Derived from lastActivity for compatibility
  endTime: z.string().optional(),
  projectName: z.string().optional(),
});

const ModelUsageSchema = z.object({
  model: z.string(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  totalTokens: z.number(),
  cost: z.number(),
  sessionCount: z.number(),
});

const MonthlyUsageDataSchema = z.object({
  month: z.string(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheCreationTokens: z.number().optional(),
  cacheReadTokens: z.number().optional(),
  totalTokens: z.number(),
  totalCost: z.number(),
  cost: z.number(), // Alias for totalCost for compatibility
  modelsUsed: z.array(z.string()).optional(),
  modelBreakdowns: z
    .array(
      z.object({
        modelName: z.string(),
        inputTokens: z.number(),
        outputTokens: z.number(),
        cacheCreationTokens: z.number().optional(),
        cacheReadTokens: z.number().optional(),
        cost: z.number(),
      }),
    )
    .optional(),
});

export const CCUsageOutputSchema = z.object({
  daily: z.array(DailyUsageDataSchema).optional(),
  monthly: z.array(MonthlyUsageDataSchema).optional(),
  sessions: z.array(SessionDataSchema).optional(),
  totals: z
    .object({
      inputTokens: z.number(),
      outputTokens: z.number(),
      cacheCreationTokens: z.number().optional(),
      cacheReadTokens: z.number().optional(),
      totalTokens: z.number(),
      totalCost: z.number(),
    })
    .optional(),
  // Legacy fields for compatibility
  inputTokens: z.number().optional(),
  outputTokens: z.number().optional(),
  totalTokens: z.number().optional(),
  cost: z.number().optional(),
  date: z.string().optional(),
});

export const UsageStatsSchema = z.object({
  todayUsage: DailyUsageDataSchema.nullable(),
  totalUsage: z
    .object({
      inputTokens: z.number(),
      outputTokens: z.number(),
      totalTokens: z.number(),
      cost: z.number(),
    })
    .nullable(),
  recentSessions: z.array(SessionDataSchema),
  topModels: z.array(ModelUsageSchema),
  isLoading: z.boolean(),
  error: z.string().optional(),
});

// Preferences schema for Raycast extension settings
export const PreferencesSchema = z.object({
  runtimeType: z.enum(["npx", "bunx", "pnpm", "deno"]).default("npx"),
  customRuntimePath: z.string().optional(),
});

// Export types inferred from schemas
export type DailyUsageData = z.infer<typeof DailyUsageDataSchema>;
export type SessionData = z.infer<typeof SessionDataSchema>;
export type ModelUsage = z.infer<typeof ModelUsageSchema>;
export type CCUsageOutput = z.infer<typeof CCUsageOutputSchema>;
export type UsageStats = z.infer<typeof UsageStatsSchema>;
export type Preferences = z.infer<typeof PreferencesSchema>;
