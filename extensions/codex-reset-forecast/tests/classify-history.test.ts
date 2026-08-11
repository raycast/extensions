import { describe, expect, it } from "vitest";
import validFixture from "./fixtures/forecast-valid.json";
import { parseForecastResponse } from "../src/api/forecast-schema";
import {
  classifyHistoryEntry,
  getPrimaryChange,
  getSourceDetail,
  historyTitle,
  isSafeSourceUrl,
} from "../src/domain/classify-history";

const forecast = parseForecastResponse(validFixture);

describe("history classification", () => {
  it("recognizes a confirmed reset even when its score delta is zero", () => {
    const entry = forecast.history[0];

    expect(entry.scoreDelta).toBe(0);
    expect(classifyHistoryEntry(entry)).toBe("confirmed-reset");
    expect(historyTitle(entry)).toBe("Confirmed Reset");
  });

  it("keeps an announcement distinct from a confirmed reset", () => {
    const entry = forecast.history[1];

    expect(classifyHistoryEntry(entry)).toBe("announcement");
    expect(historyTitle(entry)).toBe("Reset Announced");
  });

  it("prioritizes semantic events and returns a safe source URL", () => {
    const entry = forecast.history[0];

    expect(getPrimaryChange(entry)?.label).toBe("confirmed reset");
    expect(getSourceDetail(entry)?.url).toBe("https://x.com/example/status/1");
  });

  it("rejects non-HTTPS source URLs", () => {
    expect(isSafeSourceUrl("http://example.com/post")).toBe(false);
    expect(isSafeSourceUrl("not a URL")).toBe(false);
    expect(isSafeSourceUrl("https://example.com/post")).toBe(true);
  });
});
