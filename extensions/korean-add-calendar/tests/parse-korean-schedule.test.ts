import { describe, expect, it } from "vitest";

import { parseKoreanSchedule } from "../src/lib/parse-korean-schedule";

describe("parseKoreanSchedule", () => {
  const baseNow = new Date(2026, 1, 17, 9, 0, 0, 0);

  it("parses relative day with time", () => {
    const result = parseKoreanSchedule("내일 오후 3시에 회의", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.title).toBe("회의");
    expect(result.value.allDay).toBe(false);
    expectDate(result.value.start, { year: 2026, month: 2, day: 18, hour: 15, minute: 0 });
  });

  it("parses week modifier, weekday, minute and location", () => {
    const result = parseKoreanSchedule("다음주 화요일 오후 3시 반에 강남에서 팀 미팅", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.title).toBe("팀 미팅");
    expect(result.value.location).toBe("강남");
    expectDate(result.value.start, { year: 2026, month: 2, day: 24, hour: 15, minute: 30 });
  });

  it("creates all-day event when time is omitted", () => {
    const result = parseKoreanSchedule("오늘 휴가", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.allDay).toBe(true);
    expectDate(result.value.start, { year: 2026, month: 2, day: 17, hour: 0, minute: 0 });
    expectDate(result.value.end, { year: 2026, month: 2, day: 18, hour: 0, minute: 0 });
  });

  it("moves weekday-only expression to next week when already passed", () => {
    const result = parseKoreanSchedule("월요일 오후 3시에 회의", { now: new Date(2026, 1, 17, 16, 0, 0, 0) });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expectDate(result.value.start, { year: 2026, month: 2, day: 23, hour: 15, minute: 0 });
  });

  it("fails when sentence does not match pattern", () => {
    const result = parseKoreanSchedule("회의 잡아줘", { now: baseNow });

    expect(result.ok).toBe(false);
  });

  it("does not crash when absoluteDate token is absent", () => {
    const result = parseKoreanSchedule("화요일 오후 3시에 회의", { now: new Date(2026, 1, 16, 9, 0, 0, 0) });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expectDate(result.value.start, { year: 2026, month: 2, day: 17, hour: 15, minute: 0 });
  });

  it("keeps 12 PM as noon", () => {
    const result = parseKoreanSchedule("오늘 오후 12시에 점심", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expectDate(result.value.start, { year: 2026, month: 2, day: 17, hour: 12, minute: 0 });
  });

  it("converts 12 AM to midnight", () => {
    const result = parseKoreanSchedule("내일 오전 12시에 알람", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expectDate(result.value.start, { year: 2026, month: 2, day: 18, hour: 0, minute: 0 });
  });

  it("fails when AM/PM token is combined with 24-hour clock", () => {
    const result = parseKoreanSchedule("오늘 오후 14:30에 회의", { now: baseNow });
    expect(result.ok).toBe(false);
  });

  it("parses 24-hour time without AM/PM token", () => {
    const result = parseKoreanSchedule("오늘 14:30에 회의", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expectDate(result.value.start, { year: 2026, month: 2, day: 17, hour: 14, minute: 30 });
  });

  it("parses explicit year-month-day", () => {
    const result = parseKoreanSchedule("2026년 3월 2일 오후 1시에 분기 리뷰", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expectDate(result.value.start, { year: 2026, month: 3, day: 2, hour: 13, minute: 0 });
  });

  it("parses next-year expression", () => {
    const result = parseKoreanSchedule("내년 1월 2일 오전 9시에 시무식", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expectDate(result.value.start, { year: 2027, month: 1, day: 2, hour: 9, minute: 0 });
  });

  it("parses next-month day expression without time", () => {
    const result = parseKoreanSchedule("다음달 3일 월간 결산", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.allDay).toBe(true);
    expectDate(result.value.start, { year: 2026, month: 3, day: 3, hour: 0, minute: 0 });
  });

  it("keeps explicit today even when the time has already passed", () => {
    const result = parseKoreanSchedule("오늘 오후 3시에 회의", { now: new Date(2026, 1, 17, 16, 0, 0, 0) });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expectDate(result.value.start, { year: 2026, month: 2, day: 17, hour: 15, minute: 0 });
  });

  it("handles next month day correctly from month end", () => {
    const result = parseKoreanSchedule("다음달 15일 오후 3시에 점검", { now: new Date(2026, 0, 31, 9, 0, 0, 0) });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expectDate(result.value.start, { year: 2026, month: 2, day: 15, hour: 15, minute: 0 });
  });

  it("resolves this-week sunday correctly when today is sunday", () => {
    const sundayNow = new Date(2026, 1, 22, 9, 0, 0, 0);
    const result = parseKoreanSchedule("이번주 일요일 오후 3시에 회의", { now: sundayNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expectDate(result.value.start, { year: 2026, month: 2, day: 22, hour: 15, minute: 0 });
  });

  it("treats 밤 12시 as midnight of next day", () => {
    const result = parseKoreanSchedule("오늘 밤 12시에 알람", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expectDate(result.value.start, { year: 2026, month: 2, day: 18, hour: 0, minute: 0 });
  });

  it("uses the nearest location phrase when text contains multiple '에서'", () => {
    const result = parseKoreanSchedule("내일 오후 3시에 강남역에서 만나는 부산에서 온 친구와 미팅", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.location).toBe("강남역");
  });

  it("rolls month/day without year to next year when already past", () => {
    const now = new Date(2026, 11, 31, 10, 0, 0, 0);
    const result = parseKoreanSchedule("1월 1일 오후 3시에 새해 회의", { now });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expectDate(result.value.start, { year: 2027, month: 1, day: 1, hour: 15, minute: 0 });
  });

  it("fails on invalid month/day", () => {
    const result = parseKoreanSchedule("2월 31일 오후 3시에 테스트", { now: baseNow });
    expect(result.ok).toBe(false);
  });

  it("fails on invalid 24-hour time", () => {
    const result = parseKoreanSchedule("오늘 24:30에 테스트", { now: baseNow });
    expect(result.ok).toBe(false);
  });

  it("fails on invalid AM/PM hour", () => {
    const result = parseKoreanSchedule("오늘 오후 13시에 테스트", { now: baseNow });
    expect(result.ok).toBe(false);
  });
});

function expectDate(
  value: Date,
  expected: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
  },
) {
  expect(value.getFullYear()).toBe(expected.year);
  expect(value.getMonth() + 1).toBe(expected.month);
  expect(value.getDate()).toBe(expected.day);
  expect(value.getHours()).toBe(expected.hour);
  expect(value.getMinutes()).toBe(expected.minute);
}
