import { describe, expect, it } from "@jest/globals";
import { describeShape, describeParseFailure } from "./parse-diagnostics";
import { SessionUsageCommandResponseSchema } from "../types/usage-types";
import { stringToJSON } from "./string-to-json-schema";

describe("describeShape", () => {
  it("reports object keys and value types without the values", () => {
    expect(describeShape({ sessionId: "abc", totalCost: 1.23, modelsUsed: ["opus"] })).toEqual({
      modelsUsed: { array: 1, of: "string" },
      sessionId: "string",
      totalCost: "number",
    });
  });

  it("collapses arrays to a length plus the first element shape", () => {
    expect(describeShape([{ a: 1 }, { a: 2 }, { a: 3 }])).toEqual({ array: 3, of: { a: "number" } });
  });

  it("distinguishes null from objects", () => {
    expect(describeShape(null)).toBe("null");
    expect(describeShape({ resets_at: null })).toEqual({ resets_at: "null" });
  });
});

describe("describeParseFailure", () => {
  it("includes the version and the actual record shape for a renamed top-level key", () => {
    // ccusage v19+ keys the array under `session` and nests lastActivity under
    // metadata, so the legacy `sessions` schema rejects at the top level.
    const raw = JSON.stringify({ session: [{ period: "p0", agent: "claude" }], totals: {} });
    const result = stringToJSON.pipe(SessionUsageCommandResponseSchema).safeParse(raw);
    expect(result.success).toBe(false);
    if (result.success) return;

    const message = describeParseFailure("Invalid session usage data", raw, result.error, "ccusage 20.0.6");

    expect(message).toContain("ccusage version: ccusage 20.0.6");
    // The `session` vs `sessions` rename is visible in the output shape.
    expect(message).toContain('"session":');
  });

  it("falls back to 'unknown' when no version was captured", () => {
    const raw = JSON.stringify({ totals: {} });
    const result = stringToJSON.pipe(SessionUsageCommandResponseSchema).safeParse(raw);
    expect(result.success).toBe(false);
    if (result.success) return;

    const message = describeParseFailure("Invalid session usage data", raw, result.error);

    expect(message).toContain("ccusage version: unknown");
  });

  it("reports a non-JSON payload without throwing", () => {
    const raw = "command not found: ccusage";
    const result = stringToJSON.pipe(SessionUsageCommandResponseSchema).safeParse(raw);
    expect(result.success).toBe(false);
    if (result.success) return;

    const message = describeParseFailure("Invalid session usage data", raw, result.error);

    expect(message).toContain("was not valid JSON");
  });
});
