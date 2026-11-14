import { z } from "zod";

export const timestampSchema = z.iso.datetime({ offset: true });
const percentageSchema = z.number().min(0).max(100);
const optionalText = z.string().nullish();

const alertWindowSchema = z.object({
  label: z.string(),
  start_at: timestampSchema,
  end_at: timestampSchema,
  time_zone: z.string(),
});
const alertSchema = z.object({
  id: z.string(),
  kind: z.enum(["watch", "reset"]),
  state: z.enum(["active", "expired", "confirmed"]),
  source_at: timestampSchema,
  summary: z.string(),
  url: optionalText,
  score: percentageSchema.nullable(),
  window: alertWindowSchema.nullable(),
  pending: optionalText,
  confirmation_source: optionalText,
  observation_message: optionalText,
  confirmation_url: optionalText,
});
const resetRecordSchema = z.object({
  id: z.string().min(1),
  sourceDate: z.iso.date(),
  dateTime: timestampSchema,
  title: z.string(),
  description: z.string(),
  type: z.string(),
  sourceLabel: optionalText,
  sourceUrl: optionalText,
  bankedState: optionalText,
});

// The shared cache holds only the fields used by our native views.
export const forecastResponseSchema = z.object({
  updatedAt: timestampSchema,
  timelineUpdatedAt: timestampSchema,
  publishedExpiresAt: timestampSchema.optional(),
  lastResetAt: timestampSchema.nullable(),
  forecast: z
    .object({
      score24h: percentageSchema.nullable(),
      score48h: percentageSchema.nullable(),
      confidence: z.string(),
      hasOfficialSignal: z.boolean(),
      latestAlert: alertSchema.nullable(),
    })
    .nullable(),
  history: z.array(resetRecordSchema),
});
export type ForecastResponse = z.infer<typeof forecastResponseSchema>;
export type ResetRecord = z.infer<typeof resetRecordSchema>;
export type ResetAlert = z.infer<typeof alertSchema>;

const sourceForecastSchema = z.object({
  updated_at: timestampSchema,
  probabilities: z.object({ rounded_24h: percentageSchema.int(), rounded_48h: percentageSchema.int() }),
  confidence: z.string(),
  last_reset_at: timestampSchema.nullable(),
  official_signal: z.object({}).nullable(),
  latest_alert: alertSchema.nullable(),
});
const sourceTimelineSchema = z.object({
  updated_at: timestampSchema,
  events: z.array(
    z.object({
      id: z.string().min(1),
      date: z.iso.date(),
      announced_at: timestampSchema,
      group: z.string(),
      type: z.string(),
      summary: z.string(),
      text: optionalText,
      url: optionalText,
      source: optionalText,
      announcement_state: optionalText,
      confirmed: z.boolean(),
      preview: z.boolean().optional(),
      banked_state: optionalText,
    }),
  ),
});

export function parseForecastResponse(input: unknown): ForecastResponse {
  return forecastResponseSchema.parse(input);
}

// Use the documented JSON APIs, not website markup or deployment-specific functions.
export function parseSourceResponses(forecastInput: unknown, timelineInput: unknown): ForecastResponse {
  const forecast = sourceForecastSchema.parse(forecastInput);
  const timeline = sourceTimelineSchema.parse(timelineInput);
  return {
    updatedAt: forecast.updated_at,
    timelineUpdatedAt: timeline.updated_at,
    lastResetAt: forecast.last_reset_at,
    forecast: {
      score24h: forecast.probabilities.rounded_24h,
      score48h: forecast.probabilities.rounded_48h,
      confidence: forecast.confidence,
      hasOfficialSignal: forecast.official_signal !== null,
      latestAlert: forecast.latest_alert,
    },
    history: timeline.events.map((event) => {
      // Credits are banked grants or updates, even when confirmed=true.
      // Older archive rows omit announcement_state; use their documented confirmed flag.
      const type =
        event.group === "credits"
          ? "banked-reset"
          : event.group === "reset"
            ? !event.preview &&
              (event.announcement_state === "announced" || (event.announcement_state == null && event.confirmed))
              ? "reset"
              : "announcement"
            : "other";
      const sourceLabels: Record<string, string> = {
        archive: "Verified archive",
        live: "Live radar feed",
        observed: "Observed on our monitoring accounts",
        "operator-observed": "Operator observation; awaiting Tibo",
      };
      return {
        id: event.id,
        sourceDate: event.date,
        dateTime: event.announced_at,
        title:
          type === "reset"
            ? "Reset"
            : type === "banked-reset"
              ? "Banked"
              : type === "announcement"
                ? "Note"
                : event.type,
        description: event.group === "credits" ? event.text || event.summary : event.summary,
        type,
        sourceLabel: event.source ? (sourceLabels[event.source] ?? event.source) : "codex-reset.com",
        sourceUrl: event.url,
        bankedState: event.group === "credits" ? event.banked_state : undefined,
      };
    }),
  };
}
