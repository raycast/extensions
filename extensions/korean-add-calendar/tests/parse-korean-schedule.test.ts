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

  // ── parse.rb 호환 패턴 테스트 ──

  it("parses 모레 (day after tomorrow)", () => {
    const result = parseKoreanSchedule("모레 오전 10시에 병원", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.title).toBe("병원");
    expectDate(result.value.start, { year: 2026, month: 2, day: 19, hour: 10, minute: 0 });
  });

  it("parses 이번달 N일 (this month)", () => {
    const result = parseKoreanSchedule("이번달 25일 오후 2시에 정기점검", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expectDate(result.value.start, { year: 2026, month: 2, day: 25, hour: 14, minute: 0 });
  });

  it("parses 이달 N일 (this month alternate)", () => {
    const result = parseKoreanSchedule("이달 20일 팀 워크숍", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.allDay).toBe(true);
    expectDate(result.value.start, { year: 2026, month: 2, day: 20, hour: 0, minute: 0 });
  });

  it("parses 다담주 (2 weeks from now)", () => {
    const result = parseKoreanSchedule("다담주 수요일 오후 3시에 면접", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.title).toBe("면접");
    // baseNow is Tue 2/17, 다담주 수요일 = +14 - 2(tue) + 3(wed) = +15 => 3/4
    expectDate(result.value.start, { year: 2026, month: 3, day: 4, hour: 15, minute: 0 });
  });

  it("parses 다다음주 (2 weeks from now alternate)", () => {
    const result = parseKoreanSchedule("다다음주 금요일 오전 9시에 출장", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.title).toBe("출장");
    // baseNow is Tue 2/17, 다다음주 금요일 = +14 - 2(tue) + 5(fri) = +17 => 3/6
    expectDate(result.value.start, { year: 2026, month: 3, day: 6, hour: 9, minute: 0 });
  });

  it("parses 담달 N일 (next month alternate)", () => {
    const result = parseKoreanSchedule("담달 1일 오후 1시에 월간 보고", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expectDate(result.value.start, { year: 2026, month: 3, day: 1, hour: 13, minute: 0 });
  });

  it("parses deadline marker '까지' without polluting title", () => {
    const result = parseKoreanSchedule("내일 오후6시까지 떡뽁이 구매", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.title).toBe("떡뽁이 구매");
    expectDate(result.value.start, { year: 2026, month: 2, day: 18, hour: 18, minute: 0 });
  });

  it("parses day-level deadline marker '내일까지'", () => {
    const result = parseKoreanSchedule("내일까지 보고서 제출", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.title).toBe("보고서 제출");
    expect(result.value.allDay).toBe(true);
    expectDate(result.value.start, { year: 2026, month: 2, day: 18, hour: 0, minute: 0 });
  });

  it("parses time range with inferred meridiem for end time", () => {
    const result = parseKoreanSchedule("내일 오후 4시부터 6시까지 회의", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.title).toBe("회의");
    expectDate(result.value.start, { year: 2026, month: 2, day: 18, hour: 16, minute: 0 });
    expectDate(result.value.end, { year: 2026, month: 2, day: 18, hour: 18, minute: 0 });
  });

  it("parses 24-hour time range with location", () => {
    const result = parseKoreanSchedule("다음주 화요일 14:30부터 16:00까지 강남에서 팀 미팅", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.location).toBe("강남");
    expect(result.value.title).toBe("팀 미팅");
    expectDate(result.value.start, { year: 2026, month: 2, day: 24, hour: 14, minute: 30 });
    expectDate(result.value.end, { year: 2026, month: 2, day: 24, hour: 16, minute: 0 });
  });

  it("moves end time to next day when range crosses midnight", () => {
    const result = parseKoreanSchedule("오늘 23:00부터 01:00까지 서버 점검", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.title).toBe("서버 점검");
    expectDate(result.value.start, { year: 2026, month: 2, day: 17, hour: 23, minute: 0 });
    expectDate(result.value.end, { year: 2026, month: 2, day: 18, hour: 1, minute: 0 });
  });

  it("parses '전에' deadline marker without polluting title", () => {
    const result = parseKoreanSchedule("내일 6시 전에 제출", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.title).toBe("제출");
    expectDate(result.value.start, { year: 2026, month: 2, day: 18, hour: 6, minute: 0 });
  });

  it("parses relative deadline with 'N일 안에' as relative day offset", () => {
    const result = parseKoreanSchedule("3일 안에 계약서 보내기", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.title).toBe("계약서 보내기");
    expect(result.value.allDay).toBe(true);
    expect(result.value.intent).toBe("deadline");
    expectDate(result.value.start, { year: 2026, month: 2, day: 20, hour: 0, minute: 0 });
  });

  it("parses '이번주 내' as end-of-week deadline", () => {
    const result = parseKoreanSchedule("이번주 내 정산", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.title).toBe("정산");
    expect(result.value.allDay).toBe(true);
    expect(result.value.intent).toBe("deadline");
    expectDate(result.value.start, { year: 2026, month: 2, day: 22, hour: 0, minute: 0 });
  });

  it("consumes standalone '부터' and uses default duration", () => {
    const result = parseKoreanSchedule("내일 오후 4시부터 회의", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.title).toBe("회의");
    expect(result.value.intent).toBe("event");
    expectDate(result.value.start, { year: 2026, month: 2, day: 18, hour: 16, minute: 0 });
    expectDate(result.value.end, { year: 2026, month: 2, day: 18, hour: 17, minute: 0 });
  });

  it("marks explicit deadline suffix as deadline intent", () => {
    const result = parseKoreanSchedule("내일 오후 6시까지 제출", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.intent).toBe("deadline");
    expect(result.value.title).toBe("제출");
  });

  it("keeps from-to range as event intent even with '까지'", () => {
    const result = parseKoreanSchedule("내일 오후 4시부터 6시까지 회의", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.intent).toBe("event");
  });

  it("parses '오늘 중' as all-day deadline", () => {
    const result = parseKoreanSchedule("오늘 중 결재", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.intent).toBe("deadline");
    expect(result.value.allDay).toBe(true);
    expect(result.value.title).toBe("결재");
    expectDate(result.value.start, { year: 2026, month: 2, day: 17, hour: 0, minute: 0 });
  });

  it("parses '내일중' without whitespace", () => {
    const result = parseKoreanSchedule("내일중 보고서 제출", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.intent).toBe("deadline");
    expect(result.value.title).toBe("보고서 제출");
    expectDate(result.value.start, { year: 2026, month: 2, day: 18, hour: 0, minute: 0 });
  });

  it("parses '3시간 이내' as time deadline", () => {
    const result = parseKoreanSchedule("3시간 이내 계약서 회신", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.intent).toBe("deadline");
    expect(result.value.allDay).toBe(false);
    expect(result.value.title).toBe("계약서 회신");
    expectDate(result.value.start, { year: 2026, month: 2, day: 17, hour: 12, minute: 0 });
  });

  it("fails on invalid relative hour of 0", () => {
    const result = parseKoreanSchedule("0시간 이내 테스트", { now: baseNow });
    expect(result.ok).toBe(false);
  });

  it("parses '이번달 내' as end-of-month deadline", () => {
    const result = parseKoreanSchedule("이번달 내 정산", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.intent).toBe("deadline");
    expect(result.value.allDay).toBe(true);
    expect(result.value.title).toBe("정산");
    expectDate(result.value.start, { year: 2026, month: 2, day: 28, hour: 0, minute: 0 });
  });

  it("parses '다음달 내' as next month end deadline", () => {
    const result = parseKoreanSchedule("다음달 내 월간 결산", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.intent).toBe("deadline");
    expectDate(result.value.start, { year: 2026, month: 3, day: 31, hour: 0, minute: 0 });
  });

  it("parses deadline suffix '이전까지'", () => {
    const result = parseKoreanSchedule("내일 오전 9시 이전까지 보고", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.intent).toBe("deadline");
    expect(result.value.title).toBe("보고");
    expectDate(result.value.start, { year: 2026, month: 2, day: 18, hour: 9, minute: 0 });
  });

  it("parses spaced week/month tokens", () => {
    const weekResult = parseKoreanSchedule("다음 주 화요일 오후 3시에 회의", { now: baseNow });
    expect(weekResult.ok).toBe(true);
    if (weekResult.ok) {
      expectDate(weekResult.value.start, { year: 2026, month: 2, day: 24, hour: 15, minute: 0 });
    }

    const monthResult = parseKoreanSchedule("이번 달 25일 오후 2시에 정기점검", { now: baseNow });
    expect(monthResult.ok).toBe(true);
    if (monthResult.ok) {
      expectDate(monthResult.value.start, { year: 2026, month: 2, day: 25, hour: 14, minute: 0 });
    }
  });

  it("parses keyword-only deadline cues without explicit date", () => {
    const result = parseKoreanSchedule("마감 보고서 제출", { now: baseNow });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.intent).toBe("deadline");
    expect(result.value.allDay).toBe(true);
    expect(result.value.title).toBe("보고서 제출");
    expectDate(result.value.start, { year: 2026, month: 2, day: 17, hour: 0, minute: 0 });
  });

  it("parses daily recurrence", () => {
    const result = parseKoreanSchedule("매일 오후 4시 회의", { now: baseNow });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.recurrence?.frequency).toBe("daily");
    expectDate(result.value.start, { year: 2026, month: 2, day: 17, hour: 16, minute: 0 });
  });

  it("parses weekly recurrence with weekday token", () => {
    const result = parseKoreanSchedule("매주 화요일 오후 4시 회의", { now: baseNow });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.recurrence?.frequency).toBe("weekly");
    expect(result.value.recurrence?.weekday).toBe(2);
    expectDate(result.value.start, { year: 2026, month: 2, day: 17, hour: 16, minute: 0 });
  });

  it("parses monthly recurrence", () => {
    const result = parseKoreanSchedule("매월 15일 오후 4시 회의", { now: baseNow });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.recurrence?.frequency).toBe("monthly");
    expect(result.value.recurrence?.dayOfMonth).toBe(15);
    expectDate(result.value.start, { year: 2026, month: 3, day: 15, hour: 16, minute: 0 });
  });

  it("parses explicit location marker with colon", () => {
    const noSpace = parseKoreanSchedule("내일 오후 3시 회의 장소:회의실", { now: baseNow });
    expect(noSpace.ok).toBe(true);
    if (noSpace.ok) {
      expect(noSpace.value.location).toBe("회의실");
      expect(noSpace.value.title).toBe("회의");
    }

    const withSpace = parseKoreanSchedule("내일 오후 3시 회의 장소: 회의실", { now: baseNow });
    expect(withSpace.ok).toBe(true);
    if (withSpace.ok) {
      expect(withSpace.value.location).toBe("회의실");
      expect(withSpace.value.title).toBe("회의");
    }
  });

  it("normalizes explicit location marker with quotes and trailing punctuation", () => {
    const quoted = parseKoreanSchedule('내일 오후 3시 회의 장소: "B1 대회의실".', { now: baseNow });
    expect(quoted.ok).toBe(true);
    if (quoted.ok) {
      expect(quoted.value.location).toBe("B1 대회의실");
      expect(quoted.value.title).toBe("회의");
    }

    const withEqual = parseKoreanSchedule("내일 오후 3시 회의 장소= 강남역 1번 출구,", { now: baseNow });
    expect(withEqual.ok).toBe(true);
    if (withEqual.ok) {
      expect(withEqual.value.location).toBe("강남역 1번 출구");
    }
  });

  it("parses explicit location marker with '장소는'", () => {
    const result = parseKoreanSchedule("내일 오후 3시 회의 장소는 B1 대회의실", { now: baseNow });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.location).toBe("B1 대회의실");
    expect(result.value.title).toBe("회의");
  });

  it("prefers explicit location marker over '...에서' capture", () => {
    const result = parseKoreanSchedule("내일 오후 3시 강남에서 회의 장소: 회의실", { now: baseNow });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.location).toBe("회의실");
  });

  it("parses trailing location at sentence end before fallback capture", () => {
    const result = parseKoreanSchedule("내일 오후 5시 코드리뷰 회의실에서", { now: baseNow });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.title).toBe("코드리뷰");
    expect(result.value.location).toBe("회의실");
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
