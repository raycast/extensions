import { z } from "zod";

const timestampSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  error: "Expected an ISO-compatible timestamp",
});

const forecastDetailSchema = z.looseObject({
  action: z.string(),
  kind: z.string().optional(),
  name: z.string(),
  url: z.string().optional(),
});

const forecastChangeSchema = z.looseObject({
  label: z.string(),
  delta: z.number(),
  details: z.array(forecastDetailSchema).optional(),
});

const forecastHistoryEntrySchema = z.looseObject({
  at: timestampSchema,
  fromScore: z.number(),
  toScore: z.number(),
  scoreDelta: z.number(),
  changes: z.array(forecastChangeSchema),
});

export const forecastResponseSchema = z.looseObject({
  fetchedAt: timestampSchema,
  forecast: z.looseObject({
    score: z.number(),
    latestResetAt: timestampSchema,
    resetAnnounced: z.boolean().optional().default(false),
  }),
  history: z.array(forecastHistoryEntrySchema),
});

export type ForecastResponse = z.infer<typeof forecastResponseSchema>;
export type ForecastHistoryEntry = z.infer<typeof forecastHistoryEntrySchema>;
export type ForecastChange = z.infer<typeof forecastChangeSchema>;
export type ForecastDetail = z.infer<typeof forecastDetailSchema>;

export function parseForecastResponse(input: unknown): ForecastResponse {
  return forecastResponseSchema.parse(input);
}
