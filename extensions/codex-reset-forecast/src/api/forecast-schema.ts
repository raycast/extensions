import { fromCrossJSON, type SerovalNode } from "seroval";
import { z } from "zod";

export const timestampSchema = z.iso.datetime({ offset: true });
const percentageSchema = z.number().min(0).max(100);
const optionalText = z.string().nullish();

// Keep only the public fields this extension displays, not account telemetry.
const resetRecordSchema = z.object({
  id: z.string().min(1),
  dateTime: timestampSchema,
  title: z.string(),
  description: z.string(),
  type: z.string(),
  scope: optionalText,
  sourceLabel: optionalText,
  sourceUrl: optionalText,
});

const evidenceSchema = z.object({
  id: z.string().min(1),
  createdAt: timestampSchema,
  author: z.string(),
  handle: optionalText,
  summary: z.string(),
  reasoning: z.string(),
  kind: z.string(),
  sourceUrl: optionalText,
});

export const forecastResponseSchema = z.object({
  status: z.string(),
  updatedAt: timestampSchema,
  forecastStatus: z.string(),
  forecast: z
    .object({
      score24h: percentageSchema.nullable(),
      score48h: percentageSchema.nullable(),
      semanticSummary: optionalText,
      calibrationState: optionalText,
      nextReassessmentAt: timestampSchema.nullish(),
    })
    .nullable(),
  history: z.array(resetRecordSchema),
  evidence: z.array(evidenceSchema),
  ingestion: z
    .object({
      status: z.string(),
      completedAt: timestampSchema.nullish(),
      accountsRequested: z.number().int().nonnegative(),
      accountsSucceeded: z.number().int().nonnegative(),
    })
    .nullish(),
});

export type ForecastResponse = z.infer<typeof forecastResponseSchema>;
export type ResetRecord = z.infer<typeof resetRecordSchema>;
export type ResetEvidence = z.infer<typeof evidenceSchema>;

export function parseForecastResponse(input: unknown): ForecastResponse {
  return forecastResponseSchema.parse(input);
}

export function parseSnapshotPayload(input: unknown): ForecastResponse {
  // TanStack Start sends Seroval JSON. Decode data only; never evaluate scripts.
  const envelope = fromCrossJSON<unknown>(input as SerovalNode, {});
  return z.object({ result: forecastResponseSchema }).parse(envelope).result;
}
