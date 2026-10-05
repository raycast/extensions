import {
  addLocalDays,
  formatDuration,
  localDateKey,
  localDateLabel,
  localDateTimeLabel,
  parseDetails,
  parseWhenSpec,
  smartTitleCase,
} from "./parse";
import type { DateInputStyle } from "./parse";

export type QuickAddPlan =
  | {
      kind: "timed";
      summary: string;
      start: Date;
      end: Date;
      durationMinutes: number;
      durationLabel: string;
      location: string;
      description: string;
      humanWhen: string;
      googlePayload: {
        start: { dateTime: string };
        end: { dateTime: string };
      };
    }
  | {
      kind: "all-day";
      summary: string;
      startDate: string;
      endDate: string;
      durationDays: number;
      durationMinutes: number;
      durationLabel: string;
      location: string;
      description: string;
      humanWhen: string;
      googlePayload: {
        start: { date: string };
        end: { date: string };
      };
    };

export type QuickAddPlanArgs = {
  title: string;
  when: string;
  details?: string;
};

/**
 * Pure production parser/payload builder shared by the real Quick Add path and
 * the development-only parser tester. It never calls Google Calendar.
 */
export function buildQuickAddPlan(
  args: QuickAddPlanArgs,
  dateStyle: DateInputStyle,
  now = new Date(),
): QuickAddPlan {
  if (!args.title?.trim()) throw new Error("Enter an event title.");
  if (!args.when?.trim()) {
    throw new Error("Enter when, e.g. tomorrow, Friday, or next Thursday 5pm.");
  }

  const summary = smartTitleCase(args.title);
  const parsedWhen = parseWhenSpec(args.when, now, dateStyle);

  if (parsedWhen.kind === "all-day") {
    const details = parseDetails(args.details, 1440);

    if (
      details.durationMinutes < 1440 ||
      details.durationMinutes % 1440 !== 0
    ) {
      throw new Error(
        "All-day events need a whole-day duration such as 1d, 2d, or 3d. Add a start time if you want to use hours or minutes.",
      );
    }

    const durationDays = details.durationMinutes / 1440;
    const startDate = localDateKey(parsedWhen.start);
    const endDate = localDateKey(addLocalDays(parsedWhen.start, durationDays));

    return {
      kind: "all-day",
      summary,
      startDate,
      endDate,
      durationDays,
      durationMinutes: details.durationMinutes,
      durationLabel: `${durationDays}d`,
      location: details.location,
      description: details.description,
      humanWhen: `${localDateLabel(parsedWhen.start, dateStyle)} · All day`,
      googlePayload: {
        start: { date: startDate },
        end: { date: endDate },
      },
    };
  }

  const details = parseDetails(args.details, 60);
  const end = new Date(
    parsedWhen.start.getTime() + details.durationMinutes * 60_000,
  );

  return {
    kind: "timed",
    summary,
    start: parsedWhen.start,
    end,
    durationMinutes: details.durationMinutes,
    durationLabel: formatDuration(details.durationMinutes),
    location: details.location,
    description: details.description,
    humanWhen: localDateTimeLabel(parsedWhen.start, dateStyle),
    googlePayload: {
      start: { dateTime: parsedWhen.start.toISOString() },
      end: { dateTime: end.toISOString() },
    },
  };
}
