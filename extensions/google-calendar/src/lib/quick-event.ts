import * as chrono from "chrono-node";

export type QuickEventParseResult = {
  title?: string;
  startTime?: Date;
  endTime?: Date;
  allDay?: boolean;
  error?: string;
  input: string;
};

const ALL_DAY_PATTERN = /\ball[\s-]?day\b/i;

/** Parses a natural-language event, preserving whether a time was explicitly supplied. */
export function parseQuickEventInput(input: string, referenceDate = new Date()): QuickEventParseResult {
  if (!input.trim()) return { input };

  const results = chrono.parse(input, referenceDate);
  if (results.length === 0) {
    return { input, title: input, error: 'No date detected – try adding "tomorrow" or "August 3"' };
  }

  const result = results[0];
  const title = input.replace(result.text, "").replace(ALL_DAY_PATTERN, "").trim();
  if (title === "") return { input, error: "Title cannot be empty" };

  const allDay = ALL_DAY_PATTERN.test(input) || !result.start.isCertain("hour");
  return {
    input,
    title,
    startTime: result.start.date(),
    endTime: allDay ? result.end?.date() : undefined,
    allDay,
  };
}
