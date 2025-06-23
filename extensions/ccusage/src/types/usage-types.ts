import { z } from "zod";

// Base types (inferred from raw schemas)
export type DailyUsageData = z.infer<typeof DailyUsageRawSchema> & {
  cost: number; // For compatibility, derived from totalCost
};

export type MonthlyUsageData = z.infer<typeof MonthlyUsageRawSchema> & {
  cost: number; // For compatibility, derived from totalCost
};

export type SessionData = z.infer<typeof SessionDataRawSchema> & {
  // Additional computed fields for UI compatibility
  cost?: number;
  model?: string;
  startTime?: string;
  projectName?: string;
  projectPath?: string;
};

export type ModelUsage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  sessionCount: number;
};

export type TotalUsageData = z.infer<typeof TotalUsageResponseSchema>["totals"] & {
  cost: number; // For compatibility, derived from totalCost
};

// Raw ccusage output schemas (without computed cost field)
const DailyUsageRawSchema = z.object({
  date: z.string(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheCreationTokens: z.number(),
  cacheReadTokens: z.number(),
  totalTokens: z.number(),
  totalCost: z.number(),
  modelsUsed: z.array(z.string()),
  modelBreakdowns: z.array(
    z.object({
      modelName: z.string(),
      inputTokens: z.number(),
      outputTokens: z.number(),
      cacheCreationTokens: z.number(),
      cacheReadTokens: z.number(),
      cost: z.number(),
    }),
  ),
});

const MonthlyUsageRawSchema = z.object({
  month: z.string(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheCreationTokens: z.number(),
  cacheReadTokens: z.number(),
  totalTokens: z.number(),
  totalCost: z.number(),
  modelsUsed: z.array(z.string()),
  modelBreakdowns: z.array(
    z.object({
      modelName: z.string(),
      inputTokens: z.number(),
      outputTokens: z.number(),
      cacheCreationTokens: z.number(),
      cacheReadTokens: z.number(),
      cost: z.number(),
    }),
  ),
});

const SessionDataRawSchema = z.object({
  sessionId: z.string(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheCreationTokens: z.number(),
  cacheReadTokens: z.number(),
  totalTokens: z.number(),
  totalCost: z.number(),
  lastActivity: z.string(),
  modelsUsed: z.array(z.string()),
  modelBreakdowns: z.array(
    z.object({
      modelName: z.string(),
      inputTokens: z.number(),
      outputTokens: z.number(),
      cacheCreationTokens: z.number(),
      cacheReadTokens: z.number(),
      cost: z.number(),
    }),
  ),
});

// Command response schemas for ccusage CLI output
export const TotalUsageResponseSchema = z.object({
  totals: z.object({
    inputTokens: z.number(),
    outputTokens: z.number(),
    cacheCreationTokens: z.number(),
    cacheReadTokens: z.number(),
    totalTokens: z.number(),
    totalCost: z.number(),
  }),
});

export const DailyUsageResponseSchema = z.object({
  daily: z.array(DailyUsageRawSchema),
});

export const MonthlyUsageResponseSchema = z.object({
  monthly: z.array(MonthlyUsageRawSchema),
});

export const SessionUsageResponseSchema = z.object({
  sessions: z.array(SessionDataRawSchema),
});
