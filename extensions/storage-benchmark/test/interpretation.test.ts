import { describe, expect, it } from "vitest";
import { BenchmarkResult } from "../src/benchmark/protocol";
import { interpretResult } from "../src/history/interpretation";

describe("interpretResult", () => {
  it("limits the overall task tier to the weaker direction", () => {
    const interpretation = interpretResult(result(1_200, 450));

    expect(interpretation.readTier.id).toBe("very-high-throughput");
    expect(interpretation.writeTier.id).toBe("large-file-work");
    expect(interpretation.overallTier.id).toBe("large-file-work");
  });

  it("asks for confirmation before describing a slowdown as consistent", () => {
    const baseline = result(1_000, 1_000);
    const firstLowResult = interpretResult(result(790, 950), {
      baseline,
      baselineStatus: "confirmed",
      priorCompatibleLowResult: false,
    });
    const confirmedLowResult = interpretResult(result(780, 940), {
      baseline,
      baselineStatus: "confirmed",
      priorCompatibleLowResult: true,
    });

    expect(firstLowResult.comparison?.status).toBe("lower");
    expect(firstLowResult.comparison?.confirmationRecommended).toBe(true);
    expect(confirmedLowResult.comparison?.status).toBe("consistently-lower");
    expect(confirmedLowResult.comparison?.confirmationRecommended).toBe(false);
  });

  it("labels slow results against a provisional baseline", () => {
    const baseline = result(1_000, 1_000);
    const firstLowResult = interpretResult(result(790, 950), {
      baseline,
      baselineStatus: "provisional",
      priorCompatibleLowResult: false,
    });
    const repeatedLowResult = interpretResult(result(780, 940), {
      baseline,
      baselineStatus: "provisional",
      priorCompatibleLowResult: true,
    });

    expect(firstLowResult.comparison?.status).toBe("lower");
    expect(firstLowResult.comparison?.confirmationRecommended).toBe(true);
    expect(repeatedLowResult.comparison?.status).toBe("consistently-lower");
    expect(repeatedLowResult.comparison?.confirmationRecommended).toBe(false);
  });
});

function result(read: number, write: number): BenchmarkResult {
  return {
    methodologyVersion: "sequential-v1",
    maxBytes: 1_073_741_824,
    measuredBytes: 1_073_741_824,
    confidence: "high",
    read: { durationSeconds: 1, megabytesPerSecond: read, variation: 0.02 },
    write: { durationSeconds: 1, megabytesPerSecond: write, variation: 0.02 },
    volume: { id: "volume-1", name: "Example SSD" },
  };
}
