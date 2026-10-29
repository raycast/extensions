import { rm, unlink } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BenchmarkHelperError, NativeBenchmarkEngine } from "../src/benchmark/engine";
import { contextualizeBenchmarkFailure } from "../src/benchmark/errors";

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, unlink: vi.fn(actual.unlink), rm: vi.fn(actual.rm) };
});

afterEach(() => vi.mocked(unlink).mockReset());
afterEach(() => vi.mocked(rm).mockReset());

describe("benchmark cleanup failures", () => {
  it.each(["benchmark file", "transport directory", "both"])(
    "identifies only the paths left behind when cleanup fails for %s",
    async (failure) => {
      const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
      vi.mocked(unlink).mockResolvedValue(undefined);
      vi.mocked(rm).mockImplementation(actual.rm);
      const denied = Object.assign(new Error("Permission denied"), { code: "EACCES" });
      if (failure !== "transport directory") vi.mocked(unlink).mockRejectedValue(denied);
      if (failure !== "benchmark file") vi.mocked(rm).mockRejectedValue(denied);
      let benchmarkPath = "";
      let transportPath = "";
      const controller = new AbortController();
      const engine = new NativeBenchmarkEngine({
        runBenchmark: async (_test, identifier, directory, _max, _warmup, _duration, _chunk, progressPath) => {
          benchmarkPath = path.join(directory, `.raycast-disk-speed-v1-${identifier}.tmp`);
          transportPath = path.dirname(progressPath);
          controller.abort();
          throw new Error("Benchmark cancelled");
        },
      });
      try {
        const error = await engine
          .run(
            { directory: "/tmp", maxBytes: 1024, warmupBytes: 0, targetDurationSeconds: 5, chunkSizeBytes: 1024 },
            { signal: controller.signal },
          )
          .catch((error: unknown) => error);
        expect(error).toBeInstanceOf(BenchmarkHelperError);
        const context = contextualizeBenchmarkFailure(error);
        expect(context.code).toBe("cleanup_failed");
        expect(context.message).toContain("may remain");
        expect(context.message).toContain("manually");
        expect(context).toHaveProperty(
          "cleanupPaths",
          [failure !== "transport directory" && benchmarkPath, failure !== "benchmark file" && transportPath].filter(
            Boolean,
          ),
        );
        expect(unlink).toHaveBeenCalledWith(benchmarkPath);
        expect(rm).toHaveBeenCalledWith(transportPath, { recursive: true, force: true });
      } finally {
        if (transportPath) await actual.rm(transportPath, { recursive: true, force: true });
      }
    },
  );
});
