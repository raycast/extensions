import { describe, expect, it } from "vitest";
import {
  BENCHMARK_DURATION_OPTIONS,
  benchmarkRunConfiguration,
  benchmarkTargetFromConfiguration,
  benchmarkTargetValues,
  parseBenchmarkTarget,
} from "../src/benchmark/targets";

describe("benchmark targets", () => {
  it("parses independent data-size and duration choices", () => {
    expect(parseBenchmarkTarget({ maxTestSizeMiB: "1024", targetDurationSeconds: "5" })).toEqual({
      maxBytes: 1_073_741_824,
      targetDurationSeconds: 5,
    });
  });

  it("uses safe defaults for missing or malformed values", () => {
    expect(parseBenchmarkTarget({ maxTestSizeMiB: "invalid", targetDurationSeconds: "" })).toEqual({
      maxBytes: 268_435_456,
      targetDurationSeconds: 10,
    });
  });

  it("clamps values to the native helper limits", () => {
    expect(parseBenchmarkTarget({ maxTestSizeMiB: "51200", targetDurationSeconds: "120" })).toEqual({
      maxBytes: 26_843_545_600,
      targetDurationSeconds: 60,
    });
    expect(parseBenchmarkTarget({ maxTestSizeMiB: "1", targetDurationSeconds: "0" })).toEqual({
      maxBytes: 268_435_456,
      targetDurationSeconds: 1,
    });
  });

  it("offers sustained time targets through one minute", () => {
    expect(BENCHMARK_DURATION_OPTIONS).toEqual([
      { title: "3 seconds", value: "3" },
      { title: "5 seconds", value: "5" },
      { title: "10 seconds", value: "10" },
      { title: "25 seconds", value: "25" },
      { title: "45 seconds", value: "45" },
      { title: "1 minute", value: "60" },
    ]);
  });

  it("supports the expanded sustained-transfer targets", () => {
    expect(parseBenchmarkTarget({ maxTestSizeMiB: "5120", targetDurationSeconds: "10" }).maxBytes).toBe(
      5_368_709_120,
    );
    expect(parseBenchmarkTarget({ maxTestSizeMiB: "10240", targetDurationSeconds: "10" }).maxBytes).toBe(
      10_737_418_240,
    );
    expect(parseBenchmarkTarget({ maxTestSizeMiB: "25600", targetDurationSeconds: "10" }).maxBytes).toBe(
      26_843_545_600,
    );
  });

  it("builds and round-trips a complete run configuration", () => {
    const target = parseBenchmarkTarget({ maxTestSizeMiB: "512", targetDurationSeconds: "3" });
    const configuration = benchmarkRunConfiguration("/tmp/example", target);

    expect(configuration).toEqual({
      directory: "/tmp/example",
      maxBytes: 536_870_912,
      warmupBytes: 33_554_432,
      targetDurationSeconds: 3,
      chunkSizeBytes: 4_194_304,
    });
    expect(benchmarkTargetFromConfiguration(configuration)).toEqual(target);
    expect(benchmarkTargetValues(target)).toEqual({ maxTestSizeMiB: "512", targetDurationSeconds: "3" });
  });
});
