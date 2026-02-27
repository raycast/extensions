import type { GantryConfig } from "../config/types";
import type {
  ScheduleParseResult,
  ParsedSchedule,
  CalendarInterval,
} from "../types";
import { callLLM } from "./client";
import { buildScheduleParsePrompt } from "./prompts";
import { computePreview } from "../schedule/preview";

function extractJSON(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1]!.trim();
  return text.trim();
}

function validateCalendarInterval(ci: unknown): CalendarInterval | null {
  if (typeof ci !== "object" || ci === null) return null;
  const obj = ci as Record<string, unknown>;
  const result: CalendarInterval = {};

  if ("Month" in obj) {
    const v = Number(obj.Month);
    if (!Number.isInteger(v) || v < 1 || v > 12) return null;
    result.Month = v;
  }
  if ("Day" in obj) {
    const v = Number(obj.Day);
    if (!Number.isInteger(v) || v < 1 || v > 31) return null;
    result.Day = v;
  }
  if ("Weekday" in obj) {
    const v = Number(obj.Weekday);
    if (!Number.isInteger(v) || v < 0 || v > 6) return null;
    result.Weekday = v;
  }
  if ("Hour" in obj) {
    const v = Number(obj.Hour);
    if (!Number.isInteger(v) || v < 0 || v > 23) return null;
    result.Hour = v;
  }
  if ("Minute" in obj) {
    const v = Number(obj.Minute);
    if (!Number.isInteger(v) || v < 0 || v > 59) return null;
    result.Minute = v;
  }

  return result;
}

function validateSchedule(raw: unknown): ParsedSchedule | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;

  if (obj.type === "interval") {
    const seconds = Number(obj.startInterval);
    if (!Number.isInteger(seconds) || seconds <= 0) return null;
    return { type: "interval", startInterval: seconds };
  }

  if (obj.type === "calendar") {
    const intervals = obj.calendarIntervals;
    if (!Array.isArray(intervals) || intervals.length === 0) return null;
    const validated: CalendarInterval[] = [];
    for (const ci of intervals) {
      const v = validateCalendarInterval(ci);
      if (!v) return null;
      validated.push(v);
    }
    return { type: "calendar", calendarIntervals: validated };
  }

  return null;
}

export async function parseLLMSchedule(
  config: GantryConfig,
  input: string,
  signal?: AbortSignal,
): Promise<ScheduleParseResult> {
  try {
    const { systemPrompt, userMessage } = buildScheduleParsePrompt(input);
    const response = await callLLM(config, {
      systemPrompt,
      userMessage,
      signal,
    });
    const jsonStr = extractJSON(response);
    const parsed = JSON.parse(jsonStr);
    const schedule = validateSchedule(parsed);
    if (!schedule) return { ok: false, error: "Invalid schedule from AI" };
    const preview = computePreview(schedule);
    return { ok: true, schedule, ...preview };
  } catch {
    return { ok: false, error: "AI parsing failed" };
  }
}

export { extractJSON, validateSchedule };
