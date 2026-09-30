import { describe, expect, it } from "vitest";

import { MAX_BATCH_ITEMS, parseKoreanScheduleBatch } from "../src/lib/parse-korean-schedule-batch";

describe("parseKoreanScheduleBatch", () => {
  const baseNow = new Date(2026, 1, 17, 9, 0, 0, 0);

  it("splits compound sentence and parses multiple items", () => {
    const result = parseKoreanScheduleBatch("내일 오후 3시 회의, 모레 오후 4시 통화", { now: baseNow });
    expect(result.items).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
    expect(result.isBatch).toBe(true);
    expect(result.tooManyItems).toBe(false);
    expect(result.items[0]?.value.title).toBe("회의");
    expect(result.items[1]?.value.title).toBe("통화");
  });

  it("inherits date cue for trailing clauses when direct parsing fails", () => {
    const result = parseKoreanScheduleBatch("내일 오후 3시 회의 그리고 오후 5시 통화", { now: baseNow });
    expect(result.items).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
    expect(result.items[1]?.inheritedDate).toBe(true);
    expect(result.items[1]?.value.start.getDate()).toBe(18);
    expect(result.items[1]?.value.start.getHours()).toBe(17);
  });

  it("marks overflow when more than max batch items are supplied", () => {
    const sentence = "내일 3시 A, 내일 4시 B, 내일 5시 C, 내일 6시 D";
    const result = parseKoreanScheduleBatch(sentence, { now: baseNow });
    expect(result.tooManyItems).toBe(true);
    expect(result.items.length).toBeLessThanOrEqual(MAX_BATCH_ITEMS);
  });

  it("returns errors for unparseable clauses", () => {
    const result = parseKoreanScheduleBatch("내일 3시 회의, 오후 13시 테스트", { now: baseNow });
    expect(result.items).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.input).toBe("오후 13시 테스트");
  });

  it("keeps explicit location marker per split clause", () => {
    const result = parseKoreanScheduleBatch("내일 3시 회의 장소: A회의실, 오후 5시 코드리뷰 장소: B회의실", { now: baseNow });
    expect(result.items).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
    expect(result.items[0]?.value.location).toBe("A회의실");
    expect(result.items[1]?.value.location).toBe("B회의실");
  });

  it("does not split by conjunction when next clause is not a date/time cue", () => {
    const result = parseKoreanScheduleBatch("내일 오후 3시 기획 그리고 디자인 리뷰", { now: baseNow });
    expect(result.items).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
    expect(result.items[0]?.value.title).toBe("기획 그리고 디자인 리뷰");
  });

  it("splits by conjunction when next clause starts with date/time cue", () => {
    const result = parseKoreanScheduleBatch("내일 오후 3시 기획 리뷰 그리고 오후 5시 코드리뷰", { now: baseNow });
    expect(result.items).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
    expect(result.items[0]?.value.title).toBe("기획 리뷰");
    expect(result.items[1]?.value.title).toBe("코드리뷰");
  });

  it("keeps commas inside a location instead of creating another item", () => {
    const result = parseKoreanScheduleBatch("내일 오후 3시 회의 장소: 서울, 강남구", { now: baseNow });
    expect(result.items).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
    expect(result.items[0]?.value.title).toBe("회의");
    expect(result.items[0]?.value.location).toBe("서울, 강남구");
  });

  it("preserves the year when a trailing clause inherits its date", () => {
    const result = parseKoreanScheduleBatch("2028년 3월 2일 오후 3시 회의, 오후 5시 통화", { now: baseNow });
    expect(result.items).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
    expect(result.items[0]?.value.start.getFullYear()).toBe(2028);
    expect(result.items[1]?.value.start.getFullYear()).toBe(2028);
    expect(result.items[1]?.inheritedDate).toBe(true);
  });

  it("splits when a later clause starts with a full-year date", () => {
    const result = parseKoreanScheduleBatch("내일 오후 3시 회의, 2028년 3월 3일 오후 4시 통화", {
      now: baseNow,
    });
    expect(result.items).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
    expect(result.items[1]?.value.start.getFullYear()).toBe(2028);
    expect(result.items[1]?.value.start.getDate()).toBe(3);
  });

  it.each([
    "내일 오후 3시 회의, 다음 주 화요일 오후 4시 통화",
    "내일 오후 3시 회의, 20일 오후 4시 통화",
  ])("splits other parser-supported date cues: %s", (sentence) => {
    const result = parseKoreanScheduleBatch(sentence, { now: baseNow });
    expect(result.items).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it("retains distinct intents so mixed batches can be rejected before submission", () => {
    const result = parseKoreanScheduleBatch("내일 오후 3시 회의, 3일 안에 보고서 제출", { now: baseNow });
    expect(result.items).toHaveLength(2);
    expect(result.items.map((item) => item.value.intent)).toEqual(["event", "deadline"]);
  });

  it("detects recurrence even when the recurring item is not first", () => {
    const result = parseKoreanScheduleBatch("내일 오후 3시 회의, 매주 화요일 오후 4시 코드리뷰", {
      now: baseNow,
    });
    expect(result.items).toHaveLength(2);
    expect(result.items[0]?.value.recurrence).toBeUndefined();
    expect(result.items[1]?.value.recurrence).toEqual({ frequency: "weekly", weekday: 2 });
  });
});
