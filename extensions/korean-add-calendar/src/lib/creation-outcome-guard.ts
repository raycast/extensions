import { createHash } from "node:crypto";

import type { CalendarRecurrence } from "./apple-calendar";
import type { ParsedSchedule } from "./parse-korean-schedule";

export type CreationTarget = "calendar" | "reminder";

export const UNKNOWN_CREATION_OUTCOME_KEY = "__unknown_creation_outcome__";

export function buildCreationOutcomeKey({
  targetType,
  parsed,
  recurrence,
}: {
  targetType: CreationTarget;
  parsed: ParsedSchedule;
  recurrence?: CalendarRecurrence;
}): string {
  const common = {
    targetType,
    title: parsed.title.trim(),
    startEpochMs: parsed.start.getTime(),
    allDay: parsed.allDay,
    location: parsed.location?.trim() ?? "",
  };

  if (targetType === "reminder") {
    return hashCreationIdentity(common);
  }

  return hashCreationIdentity({
    ...common,
    endEpochMs: parsed.end.getTime(),
    recurrence: recurrence
      ? {
          frequency: recurrence.frequency,
          interval: recurrence.interval ?? 1,
          weekday: recurrence.weekday ?? null,
          dayOfMonth: recurrence.dayOfMonth ?? null,
          end:
            recurrence.end.type === "count"
              ? { type: recurrence.end.type, count: recurrence.end.count }
              : { type: recurrence.end.type, untilEpochMs: recurrence.end.untilEpochMs },
        }
      : null,
  });
}

function hashCreationIdentity(identity: object): string {
  return createHash("sha256").update(JSON.stringify(identity)).digest("hex");
}

export function partitionUnconfirmedCreationKeys(
  unconfirmedKeys: string[],
  currentCreationKeys: string[],
): { matching: string[]; remaining: string[] } {
  const currentKeySet = new Set(currentCreationKeys);
  const matching: string[] = [];
  const remaining: string[] = [];

  for (const key of unconfirmedKeys) {
    if (key === UNKNOWN_CREATION_OUTCOME_KEY || currentKeySet.has(key)) {
      matching.push(key);
    } else {
      remaining.push(key);
    }
  }

  return { matching, remaining };
}

export function parseStoredUnconfirmedCreationKeys(value: unknown): string[] {
  if (value === undefined || value === null || value === "") {
    return [];
  }
  if (typeof value !== "string") {
    return [UNKNOWN_CREATION_OUTCOME_KEY];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string" || item.length === 0)) {
      return [UNKNOWN_CREATION_OUTCOME_KEY];
    }
    return [...new Set(parsed)];
  } catch {
    return [UNKNOWN_CREATION_OUTCOME_KEY];
  }
}
