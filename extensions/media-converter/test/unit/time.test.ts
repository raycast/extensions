import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseTimeString, formatTimeString, toFfmpegTime } from "../../src/utils/time";

describe("parseTimeString", () => {
  it("parses bare seconds (integer)", () => {
    assert.equal(parseTimeString("90"), 90);
  });

  it("parses bare seconds (decimal)", () => {
    assert.equal(parseTimeString("12.5"), 12.5);
  });

  it("parses MM:SS", () => {
    assert.equal(parseTimeString("1:30"), 90);
  });

  it("parses MM:SS with leading zero", () => {
    assert.equal(parseTimeString("01:30"), 90);
  });

  it("parses MM:SS with millisecond fraction", () => {
    assert.equal(parseTimeString("01:30.250"), 90.25);
  });

  it("parses HH:MM:SS", () => {
    assert.equal(parseTimeString("00:01:30"), 90);
  });

  it("parses HH:MM:SS with hours > 0", () => {
    assert.equal(parseTimeString("1:02:03"), 1 * 3600 + 2 * 60 + 3);
  });

  it("parses HH:MM:SS.mmm", () => {
    assert.equal(parseTimeString("00:00:10.500"), 10.5);
  });

  it("returns null for empty string", () => {
    assert.equal(parseTimeString(""), null);
  });

  it("returns null for whitespace", () => {
    assert.equal(parseTimeString("   "), null);
  });

  it("returns null for undefined/null", () => {
    assert.equal(parseTimeString(undefined), null);
    assert.equal(parseTimeString(null), null);
  });

  it("returns null for non-numeric input", () => {
    assert.equal(parseTimeString("abc"), null);
    assert.equal(parseTimeString("1:ab"), null);
  });

  it("returns null when a segment >= 60 in MM:SS", () => {
    assert.equal(parseTimeString("1:60"), null);
  });

  it("returns null when a segment >= 60 in HH:MM:SS", () => {
    assert.equal(parseTimeString("1:60:00"), null);
    assert.equal(parseTimeString("1:00:60"), null);
  });

  it("returns null for negative values", () => {
    assert.equal(parseTimeString("-1"), null);
  });

  it("returns null for 4+ segments", () => {
    assert.equal(parseTimeString("1:2:3:4"), null);
  });

  it("trims surrounding whitespace", () => {
    assert.equal(parseTimeString("  0:30  "), 30);
  });
});

describe("formatTimeString", () => {
  it("formats seconds < 60 as M:SS", () => {
    assert.equal(formatTimeString(5), "0:05");
    assert.equal(formatTimeString(59), "0:59");
  });

  it("formats minutes as M:SS", () => {
    assert.equal(formatTimeString(90), "1:30");
    assert.equal(formatTimeString(125), "2:05");
  });

  it("formats hours as H:MM:SS", () => {
    assert.equal(formatTimeString(3600), "1:00:00");
    assert.equal(formatTimeString(3665), "1:01:05");
  });

  it("handles 0 and negatives as 0:00", () => {
    assert.equal(formatTimeString(0), "0:00");
    assert.equal(formatTimeString(-5), "0:00");
  });

  it("handles non-finite as 0:00", () => {
    assert.equal(formatTimeString(Number.NaN), "0:00");
    assert.equal(formatTimeString(Number.POSITIVE_INFINITY), "0:00");
  });
});

describe("toFfmpegTime", () => {
  it("always uses HH:MM:SS.mmm with millisecond precision", () => {
    assert.equal(toFfmpegTime(0), "00:00:00.000");
    assert.equal(toFfmpegTime(1.5), "00:00:01.500");
    assert.equal(toFfmpegTime(90), "00:01:30.000");
    assert.equal(toFfmpegTime(3661.25), "01:01:01.250");
  });

  it("clamps negative inputs to 0", () => {
    assert.equal(toFfmpegTime(-10), "00:00:00.000");
  });
});
