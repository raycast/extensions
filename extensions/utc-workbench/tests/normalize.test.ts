import { describe, it, expect } from "vitest";
import { normalize, reinterpret } from "../src/lib/normalize";

describe("normalize", () => {
  it("produces an ISO UTC string from epoch ms", () => {
    const result = normalize(1775325751123, "raw text");
    expect(result.iso).toBe("2026-04-04T18:02:31.123Z");
    expect(result.timestamp).toBe(1775325751123);
    expect(result.data).toBe("raw text");
  });
});

describe("reinterpret", () => {
  it("reinterprets an ambiguous UTC-assumed timestamp as a different zone", () => {
    // 2026-04-04 18:02:31 assumed as UTC
    const original = {
      ...normalize(1775325751000, "raw"),
      ambiguous: true,
      label: null,
      url: null,
      source: "",
      format: "Test",
    };

    // Reinterpret as America/New_York (EDT, UTC-4 on this date)
    const result = reinterpret(original, "America/New_York");
    // Wall clock 18:02:31 EDT = 22:02:31 UTC
    expect(result.iso).toBe("2026-04-04T22:02:31.000Z");
    expect(result.ambiguous).toBe(false);
  });

  it("reinterpret as UTC is a no-op", () => {
    const original = {
      ...normalize(1775325751000, "raw"),
      ambiguous: true,
      label: null,
      url: null,
      source: "",
      format: "Test",
    };
    const result = reinterpret(original, "utc");
    expect(result.iso).toBe(original.iso);
    expect(result.timestamp).toBe(original.timestamp);
    expect(result.ambiguous).toBe(false);
  });

  it("preserves data across reinterpretation", () => {
    const original = {
      ...normalize(1775325751000, "original log line"),
      ambiguous: true,
      label: null,
      url: null,
      source: "",
      format: "Test",
    };
    const result = reinterpret(original, "America/Los_Angeles");
    expect(result.data).toBe("original log line");
  });

  it("returns the original unchanged for an invalid zone", () => {
    const original = {
      ...normalize(1775325751000, "raw"),
      ambiguous: true,
      label: "api",
      url: "https://example.com",
      source: "",
      format: "Test",
    };
    const result = reinterpret(original, "Not/A_Zone");
    expect(result).toBe(original);
  });

  it("preserves label and url across reinterpretation", () => {
    const original = {
      ...normalize(1775325751000, "raw"),
      ambiguous: true,
      label: "api-gw",
      url: "https://grafana.internal/d/abc",
      source: "",
      format: "Test",
    };
    const result = reinterpret(original, "America/Los_Angeles");
    expect(result.label).toBe("api-gw");
    expect(result.url).toBe("https://grafana.internal/d/abc");
  });

  it("supports re-reinterpreting an already-resolved timestamp", () => {
    // Start ambiguous, resolve as UTC, then reinterpret as NYC. The second
    // call should treat the current UTC iso's wall clock as the wall clock,
    // not compound offsets.
    const step0 = {
      ...normalize(Date.UTC(2026, 6, 15, 12, 0, 0), "raw"),
      ambiguous: true,
      label: null,
      url: null,
      source: "",
      format: "Test",
    };
    const step1 = reinterpret(step0, "utc");
    expect(step1.iso).toBe("2026-07-15T12:00:00.000Z");
    const step2 = reinterpret(step1, "America/New_York");
    // Wall 12:00 in EDT (UTC-4) = 16:00 UTC
    expect(step2.iso).toBe("2026-07-15T16:00:00.000Z");
  });

  it("applies the correct offset across a DST boundary", () => {
    // America/New_York: EST (UTC-5) in January, EDT (UTC-4) in July.
    // The parser assumes UTC when no zone is present, so the epoch it produces
    // for "2026-01-15 12:00:00" is 2026-01-15T12:00:00Z. Reinterpreting as
    // New York should add 5h in winter, 4h in summer.
    const winterUtc = Date.UTC(2026, 0, 15, 12, 0, 0);
    const winter = reinterpret(
      { ...normalize(winterUtc, "w"), ambiguous: true, label: null, url: null, source: "", format: "Test" },
      "America/New_York"
    );
    expect(winter.iso).toBe("2026-01-15T17:00:00.000Z");

    const summerUtc = Date.UTC(2026, 6, 15, 12, 0, 0);
    const summer = reinterpret(
      { ...normalize(summerUtc, "s"), ambiguous: true, label: null, url: null, source: "", format: "Test" },
      "America/New_York"
    );
    expect(summer.iso).toBe("2026-07-15T16:00:00.000Z");
  });
});
