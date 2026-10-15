import { z } from "zod";

// `ccusage` exposes row dates as a generic `period` field, nests session
// `lastActivity` under `metadata`, and keys the session command's rows under
// `session`. Preprocess normalizes these to the explicit names declared below.

const asObject = (raw: unknown): Record<string, unknown> | null =>
  raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;

const alias =
  (from: string, to: string) =>
  (raw: unknown): unknown => {
    const obj = asObject(raw);
    if (!obj || to in obj || !(from in obj)) return raw;
    return { ...obj, [to]: obj[from] };
  };

const liftLastActivity = (raw: unknown): unknown => {
  const obj = asObject(raw);
  if (!obj || "lastActivity" in obj) return raw;
  const lastActivity = asObject(obj.metadata)?.lastActivity;
  return typeof lastActivity === "string" ? { ...obj, lastActivity } : raw;
};

// Some ccusage sessions carry no usable activity date: a non-Claude agent row,
// or a session whose entries lack timestamps, arrives with neither a top-level
// `lastActivity` nor a `metadata.lastActivity` string. Keep `lastActivity`
// optional so one dateless session degrades to "unknown" instead of failing the
// entire session list. See raycast/extensions#28423.

const modelBreakdownSchema = z.object({
  modelName: z.string(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheCreationTokens: z.number(),
  cacheReadTokens: z.number(),
  cost: z.number(),
});

const tokenTotals = {
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheCreationTokens: z.number(),
  cacheReadTokens: z.number(),
  totalTokens: z.number(),
  totalCost: z.number(),
};

const usageRowBase = {
  ...tokenTotals,
  modelsUsed: z.array(z.string()),
  modelBreakdowns: z.array(modelBreakdownSchema),
};

const aggregateMetadata = z.object({ agents: z.array(z.string()).optional() }).nullish();

export const DailyUsageResponseSchema = z.preprocess(
  alias("period", "date"),
  z.object({ date: z.string(), ...usageRowBase, metadata: aggregateMetadata }),
);

export const WeeklyUsageResponseSchema = z.preprocess(
  alias("period", "week"),
  z.object({ week: z.string(), ...usageRowBase, metadata: aggregateMetadata }),
);

export const MonthlyUsageResponseSchema = z.preprocess(
  alias("period", "month"),
  z.object({ month: z.string(), ...usageRowBase, metadata: aggregateMetadata }),
);

export const SessionResponseSchema = z.preprocess(
  (raw) => liftLastActivity(alias("period", "sessionId")(raw)),
  z.object({ sessionId: z.string(), lastActivity: z.string().optional(), ...usageRowBase }),
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
export const WeeklyUsageDataSchema = WeeklyUsageResponseSchema;
export const MonthlyUsageDataSchema = MonthlyUsageResponseSchema;
export const SessionDataSchema = SessionResponseSchema;

export const TotalUsageDataSchema = z.object(tokenTotals);

export const TotalUsageResponseSchema = z.object({
  daily: z.array(DailyUsageResponseSchema),
  totals: z.object(tokenTotals),
});

export const DailyUsageCommandResponseSchema = z.object({
  daily: z.array(DailyUsageResponseSchema),
});

export const WeeklyUsageCommandResponseSchema = z.object({
  weekly: z.array(WeeklyUsageResponseSchema),
});

export const MonthlyUsageCommandResponseSchema = z.object({
  monthly: z.array(MonthlyUsageResponseSchema),
});

export const SessionUsageCommandResponseSchema = z.preprocess(
  alias("session", "sessions"),
  z.object({
    sessions: z.array(SessionResponseSchema),
    totals: z.object(tokenTotals),
  }),
);

export const LimitWindowSchema = z.object({
  utilization: z.number(),
  resets_at: z.string().nullable(),
});

/**
 * One window from the `limits` array returned by `https://api.anthropic.com/api/oauth/usage`.
 * Anthropic publishes no schema for this endpoint, so the fields below are what the live
 * response carries:
 *
 * - `kind` names the bucket (`session`, `weekly_all`, `weekly_scoped`)
 * - `group` is the period the bucket covers (`session`, `weekly`)
 * - `scope.model.display_name` names the model a scoped bucket applies to
 *
 * Entries are self-describing, so a window for a model or period not seen here still parses.
 * Every field but those four is nullish, because the response omits them on some accounts and
 * one unreadable entry must not fail the parse for the whole payload. An entry that names no
 * model is dropped when the rows are derived rather than rejected here.
 */
export const LimitEntrySchema = z.object({
  kind: z.string(),
  group: z.string(),
  percent: z.number(),
  severity: z.string().nullish(),
  resets_at: z.string().nullable(),
  is_active: z.boolean().nullish(),
  scope: z
    .object({
      model: z.object({ id: z.string().nullish(), display_name: z.string().nullish() }).nullish(),
      surface: z.unknown().nullish(),
    })
    .nullish(),
});

export const UsageLimitDataSchema = z.object({
  five_hour: LimitWindowSchema,
  seven_day: LimitWindowSchema,
  seven_day_sonnet: LimitWindowSchema.nullish(),
  seven_day_opus: LimitWindowSchema.nullish(),
  limits: z.array(LimitEntrySchema).nullish(),
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
  burnRate: z
    .object({
      costPerHour: z.number(),
      tokensPerMinute: z.number(),
    })
    .nullish(),
  projection: z
    .object({
      remainingMinutes: z.number(),
      totalCost: z.number(),
      totalTokens: z.number(),
    })
    .nullish(),
});

export const BlocksCommandResponseSchema = z.object({
  blocks: z.array(BlockSchema),
});

export type Block = z.infer<typeof BlockSchema>;
export type BlocksCommandResponse = z.infer<typeof BlocksCommandResponseSchema>;

export type DailyUsageData = z.infer<typeof DailyUsageDataSchema>;
export type WeeklyUsageData = z.infer<typeof WeeklyUsageDataSchema>;
export type MonthlyUsageData = z.infer<typeof MonthlyUsageDataSchema>;
export type SessionData = z.infer<typeof SessionDataSchema>;
export type ModelUsage = z.infer<typeof ModelUsageSchema>;
export type TotalUsageData = z.infer<typeof TotalUsageDataSchema>;
export type TotalUsageResponse = z.infer<typeof TotalUsageResponseSchema>;
export type DailyUsageResponse = z.infer<typeof DailyUsageResponseSchema>;
export type WeeklyUsageResponse = z.infer<typeof WeeklyUsageResponseSchema>;
export type MonthlyUsageResponse = z.infer<typeof MonthlyUsageResponseSchema>;
export type SessionResponse = z.infer<typeof SessionResponseSchema>;
export type DailyUsageCommandResponse = z.infer<typeof DailyUsageCommandResponseSchema>;
export type WeeklyUsageCommandResponse = z.infer<typeof WeeklyUsageCommandResponseSchema>;
export type MonthlyUsageCommandResponse = z.infer<typeof MonthlyUsageCommandResponseSchema>;
export type SessionUsageCommandResponse = z.infer<typeof SessionUsageCommandResponseSchema>;
export type LimitWindow = z.infer<typeof LimitWindowSchema>;
export type UsageLimitData = z.infer<typeof UsageLimitDataSchema>;
