import { describe, it, expect } from "vitest";
import {
  formatDuration,
  formatElapsed,
  parseDuration,
  parseSubtasks,
} from "./time";

describe("parseDuration", () => {
  it("parses a bare number as minutes", () => {
    expect(parseDuration("90")).toBe(90);
  });
  it("parses h:mm", () => {
    expect(parseDuration("1:15")).toBe(75);
    expect(parseDuration("0:45")).toBe(45);
  });
  it("parses hour units", () => {
    expect(parseDuration("1hr")).toBe(60);
    expect(parseDuration("2 hours")).toBe(120);
    expect(parseDuration("1.5h")).toBe(90);
  });
  it("parses minute units", () => {
    expect(parseDuration("30m")).toBe(30);
    expect(parseDuration("45 minutes")).toBe(45);
  });
  it("parses combined hours and minutes", () => {
    expect(parseDuration("1h 30m")).toBe(90);
    expect(parseDuration("1hr30min")).toBe(90);
  });
  it("parses Sunsama MCP duration strings", () => {
    expect(parseDuration("1 hours and 55 minutes")).toBe(115);
    expect(parseDuration("12 hours and 7 minutes")).toBe(727);
    expect(parseDuration("0 minutes")).toBe(0);
    expect(parseDuration("2 hours")).toBe(120);
  });
  it("returns null for empty or unrecognized input", () => {
    expect(parseDuration("")).toBeNull();
    expect(parseDuration("soon")).toBeNull();
  });
});

describe("formatDuration", () => {
  it("formats minutes, hours, and both", () => {
    expect(formatDuration(45)).toBe("45m");
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(90)).toBe("1h 30m");
  });
});

describe("formatElapsed", () => {
  it("always shows hours", () => {
    expect(formatElapsed(0)).toBe("0:00:00");
    expect(formatElapsed(65)).toBe("0:01:05");
    expect(formatElapsed(3661)).toBe("1:01:01");
  });

  it("clamps negatives to zero", () => {
    expect(formatElapsed(-10)).toBe("0:00:00");
  });
});

describe("parseSubtasks", () => {
  it("takes one subtask per non-empty line, trimmed", () => {
    expect(parseSubtasks("  one  \n\n two \n")).toEqual([
      { title: "one" },
      { title: "two" },
    ]);
  });

  it("returns nothing for blank input", () => {
    expect(parseSubtasks("   \n\n")).toEqual([]);
  });
});
