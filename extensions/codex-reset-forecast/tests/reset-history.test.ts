import { describe, expect, it } from "vitest";
import fixture from "./fixtures/forecast-valid.json";
import { parseForecastResponse } from "../src/api/forecast-schema";
import { latestReset, recordLabel, resetHistory, safeSourceUrl } from "../src/domain/reset-history";

const response = parseForecastResponse(fixture);
const now = new Date("2026-09-09T07:00:00Z");

describe("reset ledger and announcements", () => {
  it("preserves every source ledger record and sorts newest first", () => {
    const shuffled = { ...response, history: [...response.history].reverse() };
    const records = resetHistory(shuffled);
    expect(records.filter((r) => r.type !== "announcement")).toHaveLength(26);
    expect(latestReset(shuffled, now)?.dateTime).toBe("2026-09-08T04:05:53.000Z");
    expect(records.map((r) => Date.parse(r.dateTime))).toEqual(
      records.map((r) => Date.parse(r.dateTime)).sort((a, b) => b - a),
    );
  });

  it("does not confuse banked resets or announcements with completed resets", () => {
    const history = [
      { ...response.history[0], type: "banked-reset", dateTime: "2026-09-09T06:00:00Z" },
      ...response.history,
    ];
    expect(latestReset({ ...response, history }, now)?.dateTime).toBe(response.history[0].dateTime);
    expect(resetHistory(response, "resets")).toHaveLength(24);
    expect(resetHistory(response, "banked")).toHaveLength(2);
    expect(resetHistory(response, "announcements").every((r) => r.evidence?.kind === "reset-intent")).toBe(true);
  });

  it("joins evidence by source URL and avoids repeating a fulfilled announcement", () => {
    const records = resetHistory(response);
    const sourceUrl = response.history[1].sourceUrl;
    expect(records.filter((r) => r.sourceUrl === sourceUrl)).toHaveLength(1);
    expect(records.find((r) => r.sourceUrl === sourceUrl)?.evidence?.kind).toBe("reset-intent");
    expect(records[0].evidence?.summary).toBe("All reset for everyone. Enjoy the week with Astra.");
  });

  it("preserves separate ledger sources even when their dates are close", () => {
    expect(resetHistory(response, "resets").filter((r) => r.dateTime.startsWith("2026-08-31"))).toHaveLength(2);
  });

  it("never advances the last-reset clock to a future or unknown record", () => {
    const history = [
      { ...response.history[0], dateTime: "2026-10-01T00:00:00Z" },
      { ...response.history[0], type: "future-kind" },
    ];
    expect(latestReset({ ...response, history }, now)).toBeUndefined();
    expect(recordLabel(history[1])).toBe("Other Record");
    expect(resetHistory({ ...response, history }, "all").some((r) => r.type === "future-kind")).toBe(true);
  });

  it.each([
    "javascript:alert(1)",
    "file:///tmp/test",
    "http://example.org",
    "https://user:pass@example.org",
    "bad url",
  ])("does not expose unsafe source URL %s", (url) => {
    expect(safeSourceUrl(url)).toBeUndefined();
  });
  it("accepts public HTTPS source links", () => {
    expect(safeSourceUrl(response.history[0].sourceUrl)).toBe(response.history[0].sourceUrl);
  });
});
