import { z } from "zod";

// Base schemas
export const DailyUsageDataSchema = z.object({
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
  cost: z.number(), // For compatibility, derived from totalCost (added in parseOutput)
});

export const MonthlyUsageDataSchema = z.object({
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
  cost: z.number(), // For compatibility, derived from totalCost (added in parseOutput)
});

export const SessionDataSchema = z.object({
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
  // Additional computed fields for UI compatibility
  cost: z.number().optional(),
  model: z.string().optional(),
  startTime: z.string().optional(),
  projectName: z.string().optional(),
  projectPath: z.string().optional(),
});

export const ModelUsageSchema = z.object({
  model: z.string(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  totalTokens: z.number(),
  cost: z.number(),
  sessionCount: z.number(),
});

// Total usage schema for ccusage --json response
export const TotalUsageDataSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheCreationTokens: z.number(),
  cacheReadTokens: z.number(),
  totalTokens: z.number(),
  totalCost: z.number(),
  cost: z.number(), // For compatibility, derived from totalCost (added in parseOutput)
});

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

// Export types inferred from schemas
export type DailyUsageData = z.infer<typeof DailyUsageDataSchema>;
export type MonthlyUsageData = z.infer<typeof MonthlyUsageDataSchema>;
export type SessionData = z.infer<typeof SessionDataSchema>;
export type ModelUsage = z.infer<typeof ModelUsageSchema>;
export type TotalUsageData = z.infer<typeof TotalUsageDataSchema>;
export type TotalUsageResponse = z.infer<typeof TotalUsageResponseSchema>;
export type DailyUsageResponse = z.infer<typeof DailyUsageResponseSchema>;
export type MonthlyUsageResponse = z.infer<typeof MonthlyUsageResponseSchema>;
export type SessionUsageResponse = z.infer<typeof SessionUsageResponseSchema>;
