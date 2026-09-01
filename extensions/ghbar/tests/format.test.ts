import { describe, expect, it } from "vitest";
import { age, clock, grouped, spokenAge } from "../src/core/format";

const NOW = new Date("2026-08-18T12:00:00Z");

function ago(seconds: number): string {
  return new Date(NOW.getTime() - seconds * 1000).toISOString();
}

describe("age", () => {
  it("under an hour reads in minutes", () => {
    expect(age(ago(0), NOW)).toBe("0m");
    expect(age(ago(45 * 60), NOW)).toBe("45m");
    expect(age(ago(59 * 60 + 59), NOW)).toBe("59m");
  });

  it("under a day reads in hours", () => {
    expect(age(ago(3600), NOW)).toBe("1h");
    expect(age(ago(3 * 3600), NOW)).toBe("3h");
  });

  it("under a month reads in days", () => {
    expect(age(ago(86_400), NOW)).toBe("1d");
    expect(age(ago(2 * 86_400), NOW)).toBe("2d");
  });

  it("anything longer reads in months", () => {
    expect(age(ago(30 * 86_400), NOW)).toBe("1mo");
    expect(age(ago(95 * 86_400), NOW)).toBe("3mo");
  });

  it("a future date does not go negative", () => {
    expect(age(new Date(NOW.getTime() + 60_000).toISOString(), NOW)).toBe("0m");
  });

  it("an invalid date does not throw", () => {
    expect(age("not a date", NOW)).toBe("0m");
  });
});

describe("spokenAge", () => {
  it("singular and plural are correct", () => {
    expect(spokenAge(ago(60), NOW)).toBe("1 minute old");
    expect(spokenAge(ago(120), NOW)).toBe("2 minutes old");
    expect(spokenAge(ago(3600), NOW)).toBe("1 hour old");
    expect(spokenAge(ago(86_400), NOW)).toBe("1 day old");
    expect(spokenAge(ago(60 * 86_400), NOW)).toBe("2 months old");
  });
});

describe("grouped", () => {
  it("inserts thousands separators", () => {
    expect(grouped(4911)).toBe("4,911");
    expect(grouped(511)).toBe("511");
    expect(grouped(1_234_567)).toBe("1,234,567");
    expect(grouped(0)).toBe("0");
  });
});

describe("clock", () => {
  it("returns 24-hour HH:mm", () => {
    // Timezone-dependent, so assert the shape rather than the value.
    expect(clock(new Date("2026-08-18T13:05:00Z"))).toMatch(/^\d{2}:\d{2}$/);
  });
});
