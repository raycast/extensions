import { NativeBenchmarkEngine } from "../benchmark/engine";
import { configureNativeBenchmarkEnvironment } from "../benchmark/native-environment";
import { BenchmarkHistory } from "../history/history";
import { RaycastHistoryStore } from "./storage";

export const benchmarkHistory = new BenchmarkHistory(new RaycastHistoryStore());

export function createBenchmarkEngine(): NativeBenchmarkEngine {
  return new NativeBenchmarkEngine({
    async runBenchmark(...argumentsForSwift) {
      configureNativeBenchmarkEnvironment();
      const { runBenchmark } = await import("swift:../../native/DiskSpeedHelper");
      return runBenchmark(...argumentsForSwift);
    },
  });
}
