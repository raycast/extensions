import { z } from "zod";

// Base schemas
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DailyUsageDataSchema = z.object({
  date: z.string(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheCreationTokens: z.number().optional(),
  cacheReadTokens: z.number().optional(),
  totalTokens: z.number(),
  totalCost: z.number(),
  cost: z.number(), // For compatibility, derived from totalCost
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ModelUsageSchema = z.object({
  model: z.string(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  totalTokens: z.number(),
  cost: z.number(),
  sessionCount: z.number(),
});

// Export types inferred from schemas
export type DailyUsageData = z.infer<typeof DailyUsageDataSchema>;
export type SessionData = z.infer<typeof SessionDataSchema>;
export type ModelUsage = z.infer<typeof ModelUsageSchema>;
