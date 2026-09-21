import { expect, it } from "vitest";
import { parseCapture } from "../src/lib/nl-parse";
const ref = new Date(2026, 8, 21, 12);
it.each([
  ["deep work tomorrow 9am-11am", "09:00", "11:00", 120],
  ["work tomorrow 11pm-1am", "23:00", "01:00", 120],
  ["work tomorrow 9am for 90m", "09:00", "10:30", 90],
  ["work tomorrow 9am", "09:00", "09:30", 30],
])("preserves the preview duration for %s", (input, start, end, durationMinutes) => {
  expect(parseCapture(input, ref)).toMatchObject({ kind: "exact", start, end, durationMinutes });
});
