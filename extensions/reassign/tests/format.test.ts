import { expect, it } from "vitest";
import {
  addMinutesLocal,
  clockPart,
  datePart,
  formatRange,
  isLocalDateTime,
  textLimitError,
  localMinutesBetween,
} from "../src/lib/format";
import { eventRange, spanMinutes } from "../src/lib/schedule-model";

const span = (start: string, end: string) => ({ start, end });

it("reads the parts of a local datetime", () => {
  expect(datePart("2026-09-22T22:45")).toBe("2026-09-22");
  expect(clockPart("2026-09-22T22:45")).toBe("22:45");
  expect(isLocalDateTime("2026-09-22T22:45")).toBe(true);
  for (const bad of ["2026-09-22", "22:45", "2026-09-22T24:00", "2026-09-22T22:45:00", "2026-09-22T22:45Z"]) {
    expect(isLocalDateTime(bad)).toBe(false);
  }
});

it("does wall arithmetic across days and months", () => {
  expect(addMinutesLocal("2026-09-30T23:50", 15)).toBe("2026-10-01T00:05");
  expect(addMinutesLocal("2026-10-01T00:05", -15)).toBe("2026-09-30T23:50");
  expect(localMinutesBetween("2026-09-22T22:00", "2026-09-23T01:00")).toBe(180);
});

it("does not add +1 for a same-day block", () => {
  expect(formatRange(span("2026-09-22T09:00", "2026-09-22T10:00"))).toBe("09:00 → 10:00");
});

it("marks +N from the start date to the end date", () => {
  expect(formatRange(span("2026-09-22T22:00", "2026-09-23T01:30"))).toBe("22:00 → 01:30 +1");
  expect(formatRange(span("2026-09-22T12:00", "2026-09-23T12:00"))).toBe("12:00 → 12:00 +1");
  expect(formatRange(span("2026-09-22T09:00", "2026-09-25T17:00"))).toBe("09:00 → 17:00 +3");
});

it("shows an end at the next midnight as the 24:00 day boundary", () => {
  expect(formatRange(span("2026-09-22T22:00", "2026-09-23T00:00"))).toBe("22:00 → 24:00");
  expect(formatRange(span("2026-09-22T00:00", "2026-09-23T00:00"))).toBe("00:00 → 24:00");
  expect(eventRange(span("2026-09-22T22:00", "2026-09-23T00:00"))).toEqual({ start: 22 * 60, end: 24 * 60 });
});

it("measures a span in wall minutes, also over several days", () => {
  expect(spanMinutes(span("2026-09-22T09:00", "2026-09-22T10:30"))).toBe(90);
  expect(spanMinutes(span("2026-09-22T22:00", "2026-09-23T01:00"))).toBe(180);
  expect(spanMinutes(span("2026-09-22T09:00", "2026-09-23T09:00"))).toBe(24 * 60);
  expect(spanMinutes(span("2026-09-22T09:00", "2026-09-25T17:00"))).toBe(3 * 24 * 60 + 8 * 60);
});

it("rejects a span whose end is not after its start", () => {
  expect(eventRange(span("2026-09-22T10:00", "2026-09-22T10:00"))).toBeNull();
  expect(eventRange(span("2026-09-22T22:00", "2026-09-22T01:00"))).toBeNull();
});

it("measures a tail row against the day it shows on", () => {
  expect(eventRange(span("2026-09-21T22:00", "2026-09-22T01:00"), "2026-09-22")).toEqual({ start: -120, end: 60 });
});

it("names the field that is over the server text limit", () => {
  expect(textLimitError("x".repeat(200), "y".repeat(2000))).toBeNull();
  expect(textLimitError("x".repeat(201))).toMatch(/name to 200/);
  expect(textLimitError("ok", "y".repeat(2001))).toMatch(/notes to 2000/);
});
