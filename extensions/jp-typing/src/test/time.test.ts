import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { formatTime, getCurrentISOTime, getElapsedSeconds } from "../utils/time";

describe("formatTime", () => {
  test("秒をMM:SS形式にフォーマットする", () => {
    expect(formatTime(0)).toBe("00:00");
    expect(formatTime(30)).toBe("00:30");
    expect(formatTime(60)).toBe("01:00");
    expect(formatTime(90)).toBe("01:30");
    expect(formatTime(120)).toBe("02:00");
    expect(formatTime(599)).toBe("09:59");
    expect(formatTime(600)).toBe("10:00");
  });

  test("大きな値も正しくフォーマットする", () => {
    expect(formatTime(3600)).toBe("60:00");
    expect(formatTime(3661)).toBe("61:01");
  });
});

describe("getCurrentISOTime", () => {
  test("現在時刻のISO文字列を返す", () => {
    const isoTime = getCurrentISOTime();
    expect(isoTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  test("Dateコンストラクタで解析可能", () => {
    const isoTime = getCurrentISOTime();
    const parsed = new Date(isoTime);
    expect(parsed.getTime()).not.toBeNaN();
  });
});

describe("getElapsedSeconds", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("ISO文字列からの経過秒数を計算する", () => {
    const baseTime = new Date("2024-01-01T00:00:00.000Z");
    const isoTime = baseTime.toISOString();

    vi.setSystemTime(baseTime.getTime() + 5000); // 5秒後
    expect(getElapsedSeconds(isoTime)).toBe(5);

    vi.setSystemTime(baseTime.getTime() + 65000); // 65秒後
    expect(getElapsedSeconds(isoTime)).toBe(65);
  });

  test("経過時間が0秒の場合", () => {
    const now = new Date();
    const isoTime = now.toISOString();

    vi.setSystemTime(now.getTime());
    expect(getElapsedSeconds(isoTime)).toBe(0);
  });

  test("負の値にならない", () => {
    const now = new Date("2024-01-01T00:00:00.000Z");
    vi.setSystemTime(now);
    const futureIso = new Date(now.getTime() + 10000).toISOString(); // 10秒後

    const elapsed = getElapsedSeconds(futureIso);
    expect(elapsed).toBe(0);
  });
});
