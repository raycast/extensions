import { describe, expect, it } from "vitest";

import { getFanStatusLabel, parseFanReaderOutput } from "../Fan/FanUtils";

describe("fan status labels", () => {
  it("maps each status to user-facing text", () => {
    expect(getFanStatusLabel("missing_reader")).toBe("Fan reader not bundled");
    expect(getFanStatusLabel("reader_error")).toBe("Fan reader failed");
    expect(getFanStatusLabel("unsupported")).toBe("Not available on this Mac");
  });
});

describe("fan reader output parsing", () => {
  it("parses the reader's actual wire format", () => {
    // Captured verbatim from a `smc-fan-reader` run on a MacBook Pro (M1 Pro).
    const payload =
      '{"fans":[{"maxRpm":4296,"minRpm":1499,"actualRpm":1509,"index":0},' +
      '{"maxRpm":4744,"minRpm":1499,"actualRpm":1643,"index":1}],"available":1}';
    expect(parseFanReaderOutput(payload)).toEqual({
      available: true,
      fans: [
        { index: 0, actualRpm: 1509, minRpm: 1499, maxRpm: 4296 },
        { index: 1, actualRpm: 1643, minRpm: 1499, maxRpm: 4744 },
      ],
      status: "available",
    });
  });

  it("returns unsupported when no fans are reported", () => {
    expect(parseFanReaderOutput(JSON.stringify({ available: false, fans: [] }))).toEqual({
      available: false,
      fans: [],
      status: "unsupported",
    });
  });

  it("drops malformed fan entries instead of passing them to the UI", () => {
    const valid = { index: 0, actualRpm: 1200, minRpm: 1000, maxRpm: 6000 };
    const payload = JSON.stringify({ available: true, fans: [valid, { index: 1, actualRpm: "3000" }, null] });
    expect(parseFanReaderOutput(payload).fans).toEqual([valid]);
  });

  it("treats invalid or non-object payloads as a reader error", () => {
    expect(parseFanReaderOutput("not json")).toEqual({ available: false, fans: [], status: "reader_error" });
    expect(parseFanReaderOutput("null")).toEqual({ available: false, fans: [], status: "reader_error" });
  });
});
