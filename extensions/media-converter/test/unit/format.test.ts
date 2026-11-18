import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatBytes, formatSavings } from "../../src/utils/format";

describe("formatBytes", () => {
  it("formats small byte values in B", () => {
    assert.equal(formatBytes(0), "0 B");
    assert.equal(formatBytes(512), "512 B");
  });

  it("formats KB with 1 decimal under 100", () => {
    assert.equal(formatBytes(1536), "1.5 KB");
  });

  it("formats KB without decimal at or above 100", () => {
    assert.equal(formatBytes(1024 * 150), "150 KB");
  });

  it("formats MB with 1 decimal under 100", () => {
    assert.equal(formatBytes(1024 * 1024 * 2), "2.0 MB");
    assert.equal(formatBytes(1024 * 1024 * 2.5), "2.5 MB");
  });

  it("formats GB with 1 decimal under 100", () => {
    assert.equal(formatBytes(1024 ** 3 * 3), "3.0 GB");
  });

  it("handles non-finite as 0 B", () => {
    assert.equal(formatBytes(Number.NaN), "0 B");
    assert.equal(formatBytes(Number.POSITIVE_INFINITY), "0 B");
  });

  it("formats negative values with a leading minus", () => {
    assert.equal(formatBytes(-1536), "-1.5 KB");
  });
});

describe("formatSavings", () => {
  it("reports saved bytes and percent when output is smaller", () => {
    // 10 MB -> 4 MB, saved 6 MB (60%)
    const saved = formatSavings(10 * 1024 * 1024, 4 * 1024 * 1024);
    assert.match(saved, /^saved 6\.0 MB \(60%\)$/);
  });

  it("reports size increase when output is larger", () => {
    // 1 MB -> 1.5 MB, +0.5 MB larger (50%)
    const larger = formatSavings(1 * 1024 * 1024, 1.5 * 1024 * 1024);
    assert.match(larger, /^\+512 KB larger \(50%\)$/);
  });

  it("reports 0% when sizes are equal", () => {
    const equal = formatSavings(2048, 2048);
    assert.equal(equal, "saved 0 B (0%)");
  });

  it("falls back to raw output size when input size is 0", () => {
    // No meaningful percentage — just show the output.
    assert.equal(formatSavings(0, 1024), "1.0 KB");
  });
});
