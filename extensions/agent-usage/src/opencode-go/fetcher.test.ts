import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseOpencodegoUsageResponse } from "./fetcher.ts";

describe("parseOpencodegoUsageResponse", () => {
  it("parses a valid usage payload", () => {
    const { usage, error } = parseOpencodegoUsageResponse({
      usage: {
        rolling: { status: "ok", percent: 15, resetsAt: "2026-09-07T06:54:09.396Z" },
        weekly: { status: "ok", percent: 25, resetsAt: "2026-09-14T00:00:00.396Z" },
        monthly: { status: "ok", percent: 50, resetsAt: "2026-10-03T03:17:02.396Z" },
      },
    });

    assert.equal(error, null);
    assert.ok(usage);
    assert.equal(usage.rolling.percent, 15);
    assert.equal(usage.weekly.percent, 25);
    assert.equal(usage.monthly.percent, 50);
    assert.equal(usage.rolling.resetsAt, "2026-09-07T06:54:09.396Z");
  });

  it("accepts null and missing resetsAt values", () => {
    const { usage, error } = parseOpencodegoUsageResponse({
      usage: {
        rolling: { status: "ok", percent: 15, resetsAt: null },
        weekly: { status: "ok", percent: 25 },
        monthly: { status: "ok", percent: 50, resetsAt: "2026-10-03T03:17:02.396Z" },
      },
    });

    assert.equal(error, null);
    assert.ok(usage);
    assert.equal(usage.rolling.resetsAt, null);
    assert.equal(usage.weekly.resetsAt, null);
    assert.equal(usage.monthly.resetsAt, "2026-10-03T03:17:02.396Z");
  });

  it("returns a parse error for non-finite percent values", () => {
    const { usage, error } = parseOpencodegoUsageResponse({
      usage: {
        rolling: { status: "ok", percent: Number.NaN, resetsAt: null },
        weekly: { status: "ok", percent: 25, resetsAt: null },
        monthly: { status: "ok", percent: 50, resetsAt: null },
      },
    });
    assert.equal(usage, null);
    assert.equal(error?.type, "parse_error");
    assert.match(error?.message ?? "", /rolling/);
  });

  it("clamps out-of-range percent values", () => {
    const { usage, error } = parseOpencodegoUsageResponse({
      usage: {
        rolling: { status: "ok", percent: -10, resetsAt: null },
        weekly: { status: "ok", percent: 150, resetsAt: null },
        monthly: { status: "ok", percent: 50, resetsAt: null },
      },
    });

    assert.equal(error, null);
    assert.ok(usage);
    assert.equal(usage.rolling.percent, 0);
    assert.equal(usage.weekly.percent, 100);
    assert.equal(usage.monthly.percent, 50);
  });

  it("returns a parse error when the usage container is missing", () => {
    const { usage, error } = parseOpencodegoUsageResponse({});
    assert.equal(usage, null);
    assert.equal(error?.type, "parse_error");
  });

  it("returns a parse error when a window is invalid", () => {
    const { usage, error } = parseOpencodegoUsageResponse({
      usage: {
        rolling: { status: "ok", percent: 15, resetsAt: "2026-09-07T06:54:09.396Z" },
        weekly: { status: "ok", resetsAt: "2026-09-14T00:00:00.396Z" },
        monthly: { status: "ok", percent: 50, resetsAt: "2026-10-03T03:17:02.396Z" },
      },
    });
    assert.equal(usage, null);
    assert.equal(error?.type, "parse_error");
    assert.match(error?.message ?? "", /weekly/);
  });

  it("returns a parse error for non-object payloads", () => {
    const { usage, error } = parseOpencodegoUsageResponse("nope");
    assert.equal(usage, null);
    assert.equal(error?.type, "parse_error");
  });
});
