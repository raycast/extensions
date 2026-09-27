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

it.each([
  ["work tomorrow noon-1pm", "12:00", "13:00", 60, "work", "2026-09-22"],
  ["work midnight-2am", "00:00", "02:00", 120, "work", "2026-09-22"],
  ["Noon-1PM", "12:00", "13:00", 60, "", "2026-09-21"],
])(
  "parses a hyphenated range whose start is noon/midnight for %s",
  (input, start, end, durationMinutes, name, date) => {
    expect(parseCapture(input, ref)).toMatchObject({ kind: "exact", start, end, durationMinutes, name, date });
  },
);

it.each([
  ["noon to 1pm", "12:00", "13:00", 60, ""],
  ["lunch at noon", "12:00", "12:30", 30, "lunch"],
  ["noon meeting at 3pm", "12:00", "12:30", 30, "meeting 3pm"],
])("preserves prose noon/midnight parsing for %s", (input, start, end, durationMinutes, name) => {
  expect(parseCapture(input, ref)).toMatchObject({ kind: "exact", start, end, durationMinutes, name });
});

it.each([
  ["call tomorrow 3pm about noon menu", "call about noon menu", "15:00", "15:30", 30],
  ["watch tomorrow 3pm Midnight Run", "watch Midnight Run", "15:00", "15:30", 30],
  ["work tomorrow midnight-2am then noon review", "work then noon review", "00:00", "02:00", 120],
  ["work tomorrow 11pm-midnight", "work", "23:00", "00:00", 60],
  ["work tomorrow noon-midnight", "work", "12:00", "00:00", 720],
])("preserves the original title around normalized time words for %s", (input, name, start, end, durationMinutes) => {
  expect(parseCapture(input, ref)).toMatchObject({ name, start, end, durationMinutes, date: "2026-09-22" });
});
