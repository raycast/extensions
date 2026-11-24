import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { parseKoreanSchedule } from "../src/lib/parse-korean-schedule";

const HANGUL_PATTERN = /[가-힣]/u;

describe("user-facing language guard", () => {
  const baseNow = new Date(2026, 1, 17, 9, 0, 0, 0);

  it("keeps parser error messages in English", () => {
    const samples = ["", "회의 잡아줘", "0일 안에 테스트", "오늘 24:30에 테스트", "0시간 이내 테스트", "매월 0일 오후 3시 회의"];
    for (const sample of samples) {
      const result = parseKoreanSchedule(sample, { now: baseNow });
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(HANGUL_PATTERN.test(result.error)).toBe(false);
    }
  });

  it("keeps command UI copy in English except for the Korean input example", () => {
    const source = fs.readFileSync(path.resolve(__dirname, "../src/create-korean-calendar-event.tsx"), "utf8");
    const sourceWithoutInputExample = source.replace(/const KOREAN_INPUT_EXAMPLE = "[^"]+";/u, "");

    expect(source).toContain("KOREAN_INPUT_EXAMPLE");
    expect(HANGUL_PATTERN.test(sourceWithoutInputExample)).toBe(false);
  });

  it("keeps Apple bridge permission guidance and thrown errors in English", () => {
    const source = fs.readFileSync(path.resolve(__dirname, "../src/lib/apple-calendar.ts"), "utf8");
    const linesToCheck = source
      .split("\n")
      .filter((line) => line.includes("PERMISSION_GUIDE") || line.includes("throw new Error("));

    expect(linesToCheck.length).toBeGreaterThan(0);
    for (const line of linesToCheck) {
      expect(HANGUL_PATTERN.test(line)).toBe(false);
    }
  });

  it("keeps Swift helper errors independent of the macOS display language", () => {
    const source = fs.readFileSync(path.resolve(__dirname, "../swift/Sources/KoreanCalendarAPI.swift"), "utf8");

    expect(HANGUL_PATTERN.test(source)).toBe(false);
    expect(source).not.toContain("error.localizedDescription");
  });
});
