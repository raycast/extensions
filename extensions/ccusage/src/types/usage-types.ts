import { z } from "zod";

// ccusage emits a single `period` field per row that means different things
// per command (date for daily, month for monthly, session id for sessions),
// nests session `lastActivity` under `metadata`, and keys the session
// command's top-level array as `session`. Preprocess maps these into
// `date` / `month` / `sessionId` / `lastActivity` / `sessions` so consumers
// see a consistent shape.

const aliasPeriodTo =
  (key: "date" | "month" | "sessionId") =>
  (raw: unknown): unknown => {
    if (typeof raw !== "object" || raw === null) return raw;
    const row = raw as Record<string, unknown>;
    if (key in row || !("period" in row)) return row;
    return { ...row, [key]: row.period };
  };

const liftSessionMetadata = (raw: unknown): unknown => {
  if (typeof raw !== "object" || raw === null) return raw;
  const row = raw as Record<string, unknown>;
  if ("lastActivity" in row) return row;
  const metadata = row.metadata;
  if (typeof metadata !== "object" || metadata === null) return row;
  const lastActivity = (metadata as Record<string, unknown>).lastActivity;
  if (lastActivity === undefined) return row;
  return { ...row, lastActivity };
};

const normalizeSessionRow = (raw: unknown): unknown => liftSessionMetadata(aliasPeriodTo("sessionId")(raw));

const modelBreakdownSchema = z.object({
  modelName: z.string(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheCreationTokens: z.number(),
  cacheReadTokens: z.number(),
  cost: z.number(),
});

export const DailyUsageResponseSchema = z.preprocess(
  aliasPeriodTo("date"),
  z.object({
    date: z.string(),
    inputTokens: z.number(),
    outputTokens: z.number(),
    cacheCreationTokens: z.number(),
    cacheReadTokens: z.number(),
    totalTokens: z.number(),
    totalCost: z.number(),
    modelsUsed: z.array(z.string()),
    modelBreakdowns: z.array(modelBreakdownSchema),
  }),
);

export const MonthlyUsageResponseSchema = z.preprocess(
  aliasPeriodTo("month"),
  z.object({
    month: z.string(),
    inputTokens: z.number(),
    outputTokens: z.number(),
    cacheCreationTokens: z.number(),
    cacheReadTokens: z.number(),
    totalTokens: z.number(),
    totalCost: z.number(),
    modelsUsed: z.array(z.string()),
    modelBreakdowns: z.array(modelBreakdownSchema),
  }),
);

export const SessionResponseSchema = z.preprocess(
  normalizeSessionRow,
  z.object({
    sessionId: z.string(),
    inputTokens: z.number(),
    outputTokens: z.number(),
    cacheCreationTokens: z.number(),
    cacheReadTokens: z.number(),
    totalTokens: z.number(),
    totalCost: z.number(),
    lastActivity: z.string(),
    modelsUsed: z.array(z.string()),
    modelBreakdowns: z.array(modelBreakdownSchema),
  }),
);

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

export const SessionUsageCommandResponseSchema = z.preprocess(
  (raw) => {
    if (typeof raw !== "object" || raw === null) return raw;
    const root = raw as Record<string, unknown>;
    if ("sessions" in root || !("session" in root)) return root;
    return { ...root, sessions: root.session };
  },
  z.object({
    sessions: z.array(SessionResponseSchema),
    totals: z.object({
      inputTokens: z.number(),
      outputTokens: z.number(),
      cacheCreationTokens: z.number(),
      cacheReadTokens: z.number(),
      totalCost: z.number(),
      totalTokens: z.number(),
    }),
  }),
);

export const LimitWindowSchema = z.object({
  utilization: z.number(),
  resets_at: z.string().nullable(),
});

export const UsageLimitDataSchema = z.object({
  five_hour: LimitWindowSchema,
  seven_day: LimitWindowSchema,
  seven_day_sonnet: LimitWindowSchema.nullish(),
  seven_day_opus: LimitWindowSchema.nullish(),
  extra_usage: z
    .object({
      is_enabled: z.boolean(),
      used_credits: z.number().nullable(),
      monthly_limit: z.number().nullable(),
    })
    .nullish(),
});

export const BlockSchema = z.object({
  id: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  actualEndTime: z.string().nullable(),
  isActive: z.boolean(),
  isGap: z.boolean(),
  totalTokens: z.number(),
  costUSD: z.number(),
  models: z.array(z.string()),
});

export const BlocksCommandResponseSchema = z.object({
  blocks: z.array(BlockSchema),
});

export type Block = z.infer<typeof BlockSchema>;
export type BlocksCommandResponse = z.infer<typeof BlocksCommandResponseSchema>;

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
export type LimitWindow = z.infer<typeof LimitWindowSchema>;
export type UsageLimitData = z.infer<typeof UsageLimitDataSchema>;
