import { describe, expect, it } from "vitest";

import { parseKoreanSchedule } from "../src/lib/parse-korean-schedule";

const baseNow = new Date(2026, 1, 17, 9, 0, 0, 0);

describe("parseKoreanSchedule regression fixtures", () => {
  it("keeps range expression as event intent", () => {
    const result = parseKoreanSchedule("내일 오후 4시부터 6시까지 회의", { now: baseNow });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.intent).toBe("event");
    expect(result.value.title).toBe("회의");
    expectDate(result.value.start, { year: 2026, month: 2, day: 18, hour: 16, minute: 0 });
    expectDate(result.value.end, { year: 2026, month: 2, day: 18, hour: 18, minute: 0 });
  });

  it("keeps standalone '부터' as event intent", () => {
    const result = parseKoreanSchedule("내일 오후 4시부터 회의", { now: baseNow });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.intent).toBe("event");
    expect(result.value.title).toBe("회의");
    expectDate(result.value.start, { year: 2026, month: 2, day: 18, hour: 16, minute: 0 });
    expectDate(result.value.end, { year: 2026, month: 2, day: 18, hour: 17, minute: 0 });
  });

  it("parses deadline suffix variants without title pollution", () => {
    const samples = ["내일 6시 전에 제출", "내일 6시 전 제출", "내일 6시 이전 제출", "내일 6시 이전까지 제출"];
    for (const sample of samples) {
      const result = parseKoreanSchedule(sample, { now: baseNow });
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.value.intent).toBe("deadline");
      expect(result.value.title).toBe("제출");
      expectDate(result.value.start, { year: 2026, month: 2, day: 18, hour: 6, minute: 0 });
    }
  });

  it("parses day/hour/month deadline expressions", () => {
    const dayResult = parseKoreanSchedule("3일 안에 계약서 보내기", { now: baseNow });
    expect(dayResult.ok).toBe(true);
    if (dayResult.ok) {
      expect(dayResult.value.intent).toBe("deadline");
      expect(dayResult.value.allDay).toBe(true);
      expectDate(dayResult.value.start, { year: 2026, month: 2, day: 20, hour: 0, minute: 0 });
    }

    const hourResult = parseKoreanSchedule("3시간 이내 계약서 회신", { now: baseNow });
    expect(hourResult.ok).toBe(true);
    if (hourResult.ok) {
      expect(hourResult.value.intent).toBe("deadline");
      expect(hourResult.value.allDay).toBe(false);
      expectDate(hourResult.value.start, { year: 2026, month: 2, day: 17, hour: 12, minute: 0 });
    }

    const monthResult = parseKoreanSchedule("이번달 내 정산", { now: baseNow });
    expect(monthResult.ok).toBe(true);
    if (monthResult.ok) {
      expect(monthResult.value.intent).toBe("deadline");
      expect(monthResult.value.allDay).toBe(true);
      expectDate(monthResult.value.start, { year: 2026, month: 2, day: 28, hour: 0, minute: 0 });
    }
  });

  it("parses '오늘 중' and '내일중' as day-level deadlines", () => {
    const todayResult = parseKoreanSchedule("오늘 중 결재", { now: baseNow });
    expect(todayResult.ok).toBe(true);
    if (todayResult.ok) {
      expect(todayResult.value.intent).toBe("deadline");
      expect(todayResult.value.allDay).toBe(true);
      expect(todayResult.value.title).toBe("결재");
      expectDate(todayResult.value.start, { year: 2026, month: 2, day: 17, hour: 0, minute: 0 });
    }

    const tomorrowResult = parseKoreanSchedule("내일중 보고", { now: baseNow });
    expect(tomorrowResult.ok).toBe(true);
    if (tomorrowResult.ok) {
      expect(tomorrowResult.value.intent).toBe("deadline");
      expect(tomorrowResult.value.title).toBe("보고");
      expectDate(tomorrowResult.value.start, { year: 2026, month: 2, day: 18, hour: 0, minute: 0 });
    }
  });

  it("keeps existing baseline parsing behavior", () => {
    const baselineSamples = [
      {
        input: "내일 오후 3시에 회의",
        expected: { year: 2026, month: 2, day: 18, hour: 15, minute: 0, intent: "event" as const },
      },
      {
        input: "다음주 화요일 오후 3시 반에 강남에서 팀 미팅",
        expected: { year: 2026, month: 2, day: 24, hour: 15, minute: 30, intent: "event" as const },
      },
      {
        input: "오늘 23:00부터 01:00까지 서버 점검",
        expected: { year: 2026, month: 2, day: 17, hour: 23, minute: 0, intent: "event" as const },
      },
      {
        input: "내일까지 보고서 제출",
        expected: { year: 2026, month: 2, day: 18, hour: 0, minute: 0, intent: "deadline" as const },
      },
    ];

    for (const sample of baselineSamples) {
      const result = parseKoreanSchedule(sample.input, { now: baseNow });
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.value.intent).toBe(sample.expected.intent);
      expectDate(result.value.start, sample.expected);
    }
  });

  it("fails on invalid relative numbers and missing date cues", () => {
    expect(parseKoreanSchedule("0일 안에 테스트", { now: baseNow }).ok).toBe(false);
    expect(parseKoreanSchedule("0시간 이내 테스트", { now: baseNow }).ok).toBe(false);
    expect(parseKoreanSchedule("회의 잡아줘", { now: baseNow }).ok).toBe(false);
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
