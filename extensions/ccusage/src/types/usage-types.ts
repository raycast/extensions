import { z } from "zod";

export const DailyUsageResponseSchema = z.object({
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

export const MonthlyUsageResponseSchema = z.object({
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

export const SessionResponseSchema = z.object({
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

export const ModelUsageSchema = z.object({
  model: z.string(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  totalTokens: z.number(),
  totalCost: z.number(),
  sessionCount: z.number(),
});

export const DailyUsageDataSchema = DailyUsageResponseSchema;
export const MonthlyUsageDataSchema = MonthlyUsageResponseSchema;
export const SessionDataSchema = SessionResponseSchema;

export const TotalUsageDataSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheCreationTokens: z.number(),
  cacheReadTokens: z.number(),
  totalTokens: z.number(),
  totalCost: z.number(),
});

export const TotalUsageResponseSchema = z.object({
  daily: z.array(DailyUsageResponseSchema),
  totals: z.object({
    inputTokens: z.number(),
    outputTokens: z.number(),
    cacheCreationTokens: z.number(),
    cacheReadTokens: z.number(),
    totalTokens: z.number(),
    totalCost: z.number(),
  }),
});

export const DailyUsageCommandResponseSchema = z.object({
  daily: z.array(DailyUsageResponseSchema),
});

export const MonthlyUsageCommandResponseSchema = z.object({
  monthly: z.array(MonthlyUsageResponseSchema),
});

export const SessionUsageCommandResponseSchema = z.object({
  sessions: z.array(SessionResponseSchema),
  totals: z.object({
    inputTokens: z.number(),
    outputTokens: z.number(),
    cacheCreationTokens: z.number(),
    cacheReadTokens: z.number(),
    totalCost: z.number(),
    totalTokens: z.number(),
  }),
});

export type DailyUsageData = z.infer<typeof DailyUsageDataSchema>;
export type MonthlyUsageData = z.infer<typeof MonthlyUsageDataSchema>;
export type SessionData = z.infer<typeof SessionDataSchema>;
export type ModelUsage = z.infer<typeof ModelUsageSchema>;
export type TotalUsageData = z.infer<typeof TotalUsageDataSchema>;
export type TotalUsageResponse = z.infer<typeof TotalUsageResponseSchema>;
export type DailyUsageResponse = z.infer<typeof DailyUsageResponseSchema>;
export type MonthlyUsageResponse = z.infer<typeof MonthlyUsageResponseSchema>;
export type SessionResponse = z.infer<typeof SessionResponseSchema>;
export type DailyUsageCommandResponse = z.infer<typeof DailyUsageCommandResponseSchema>;
export type MonthlyUsageCommandResponse = z.infer<typeof MonthlyUsageCommandResponseSchema>;
export type SessionUsageCommandResponse = z.infer<typeof SessionUsageCommandResponseSchema>;
