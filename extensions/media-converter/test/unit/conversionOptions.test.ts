import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveTrim } from "../../src/utils/conversionOptions";

describe("resolveTrim", () => {
  it("normalizes valid values into one shared trim shape", () => {
    assert.deepEqual(resolveTrim(" 10 ", "0:30"), {
      trim: { start: "10", end: "0:30" },
      startSec: 10,
      endSec: 30,
    });
  });

  it("rejects invalid and reversed ranges", () => {
    assert.match(resolveTrim("nope", "").error ?? "", /Start time/);
    assert.equal(resolveTrim("20", "10").error, "End time must be after start time");
  });
});
