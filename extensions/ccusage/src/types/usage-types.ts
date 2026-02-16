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

export const WeeklyUsageResponseSchema = z.object({
  weekly: z.array(
    z.object({
      week: z.string(),
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
          totalTokens: z.number().optional(),
        }),
      ),
    }),
  ),
  totals: z.object({
    inputTokens: z.number(),
    outputTokens: z.number(),
    cacheCreationTokens: z.number(),
    cacheReadTokens: z.number(),
    totalTokens: z.number(),
    totalCost: z.number(),
  }),
});

export const BlocksUsageResponseSchema = z.object({
  blocks: z.array(
    z.object({
      id: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      actualEndTime: z.string().nullable(),
      isActive: z.boolean(),
      isGap: z.boolean(),
      entries: z.number(),
      tokenCounts: z.object({
        inputTokens: z.number(),
        outputTokens: z.number(),
        cacheCreationTokens: z.number(),
        cacheReadTokens: z.number(),
      }),
      totalTokens: z.number(),
      costUSD: z.number(),
      models: z.array(z.string()),
      burnRate: z
        .object({
          tokensPerMinute: z.number(),
          costPerHour: z.number(),
        })
        .nullable(),
      projection: z
        .object({
          totalTokens: z.number(),
          totalCost: z.number(),
        })
        .nullable(),
      tokenLimitStatus: z
        .object({
          limit: z.number(),
          projectedUsage: z.number(),
          percentUsed: z.number(),
          status: z.enum(["exceeds", "warning", "ok"]),
        })
        .optional(),
      usageLimitResetTime: z.string().optional(),
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
export const WeeklyUsageDataSchema = WeeklyUsageResponseSchema.shape.weekly.element;
export const SessionBlockDataSchema = BlocksUsageResponseSchema.shape.blocks.element;
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

export const LimitWindowSchema = z.object({
  utilization: z.number(),
  resets_at: z.string(),
});

export const UsageLimitDataSchema = z.object({
  five_hour: LimitWindowSchema,
  seven_day: LimitWindowSchema,
});

export type DailyUsageData = z.infer<typeof DailyUsageDataSchema>;
export type MonthlyUsageData = z.infer<typeof MonthlyUsageDataSchema>;
export type WeeklyUsageData = z.infer<typeof WeeklyUsageDataSchema>;
export type SessionBlockData = z.infer<typeof SessionBlockDataSchema>;
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
export type LimitWindow = z.infer<typeof LimitWindowSchema>;
export type UsageLimitData = z.infer<typeof UsageLimitDataSchema>;
