import { BenchmarkConfidence, BenchmarkResult } from "../benchmark/protocol";
import { BenchmarkRunInput, HistorySnapshot, compatibilityKey } from "./history";

export type TaskTierId = "everyday" | "large-file-work" | "demanding-workflows" | "very-high-throughput";

export interface TaskTier {
  id: TaskTierId;
  title: string;
  description: string;
  minimumMBps: number;
}

export type BaselineComparisonStatus = "provisional" | "normal" | "higher" | "lower" | "consistently-lower";

export interface ResultComparison {
  status: BaselineComparisonStatus;
  readChange: number;
  writeChange: number;
  confirmationRecommended: boolean;
}

export interface ResultInterpretation {
  readTier: TaskTier;
  writeTier: TaskTier;
  overallTier: TaskTier;
  confidence: BenchmarkConfidence;
  confidenceDescription: string;
  comparison?: ResultComparison;
}

export interface BaselineContext {
  baseline: BenchmarkResult;
  baselineStatus: "provisional" | "confirmed";
  priorCompatibleLowResult: boolean;
}

const TIERS: TaskTier[] = [
  {
    id: "everyday",
    title: "Everyday Storage",
    description: "Suitable for documents, browsing, and light file transfers.",
    minimumMBps: 0,
  },
  {
    id: "large-file-work",
    title: "Large-File Work",
    description: "Suitable for regular large-file transfers and mainstream creative work.",
    minimumMBps: 100,
  },
  {
    id: "demanding-workflows",
    title: "Demanding Workflows",
    description: "Suitable for demanding local media and large-data workflows.",
    minimumMBps: 500,
  },
  {
    id: "very-high-throughput",
    title: "Very High Throughput",
    description: "Suitable for workflows that benefit from very fast local sequential storage.",
    minimumMBps: 1_000,
  },
];

export function interpretResult(result: BenchmarkResult, baselineContext?: BaselineContext): ResultInterpretation {
  const readTier = tierForThroughput(result.read.megabytesPerSecond);
  const writeTier = tierForThroughput(result.write.megabytesPerSecond);
  const overallTier = tierForThroughput(Math.min(result.read.megabytesPerSecond, result.write.megabytesPerSecond));

  return {
    readTier,
    writeTier,
    overallTier,
    confidence: result.confidence,
    confidenceDescription: confidenceDescription(result.confidence),
    ...(baselineContext ? { comparison: compareWithBaseline(result, baselineContext) } : {}),
  };
}

export function interpretStoredRun(snapshot: HistorySnapshot, run: BenchmarkRunInput): ResultInterpretation {
  const volume = snapshot.volumes[run.volume.id];
  const key = compatibilityKey(run);
  const baselineReference = volume?.baselines[key];
  if (!baselineReference) return interpretResult(run.result);

  const previousCompatible = volume.successfulRuns.find(
    (candidate) => candidate.id !== run.id && compatibilityKey(candidate) === key,
  );
  const previousWasLow = previousCompatible
    ? interpretResult(previousCompatible.result, {
        baseline: baselineReference.result,
        baselineStatus: baselineReference.status,
        priorCompatibleLowResult: false,
      }).comparison?.status === "lower"
    : false;

  return interpretResult(run.result, {
    baseline: baselineReference.result,
    baselineStatus: baselineReference.status,
    priorCompatibleLowResult: previousWasLow,
  });
}

export function tierForThroughput(megabytesPerSecond: number): TaskTier {
  let selected = TIERS[0];
  for (const tier of TIERS) {
    if (megabytesPerSecond >= tier.minimumMBps) selected = tier;
  }
  return selected;
}

function compareWithBaseline(result: BenchmarkResult, context: BaselineContext): ResultComparison {
  const readChange = relativeChange(context.baseline.read.megabytesPerSecond, result.read.megabytesPerSecond);
  const writeChange = relativeChange(context.baseline.write.megabytesPerSecond, result.write.megabytesPerSecond);

  const weakestChange = Math.min(readChange, writeChange);
  if (weakestChange <= -0.1) {
    return {
      status: context.priorCompatibleLowResult ? "consistently-lower" : "lower",
      readChange,
      writeChange,
      confirmationRecommended: !context.priorCompatibleLowResult,
    };
  }
  if (context.baselineStatus === "provisional") {
    return { status: "provisional", readChange, writeChange, confirmationRecommended: true };
  }
  if (readChange >= 0.1 && writeChange >= 0.1) {
    return { status: "higher", readChange, writeChange, confirmationRecommended: false };
  }
  return { status: "normal", readChange, writeChange, confirmationRecommended: false };
}

function relativeChange(baseline: number, current: number): number {
  if (baseline === 0) return current === 0 ? 0 : Number.POSITIVE_INFINITY;
  return (current - baseline) / baseline;
}

function confidenceDescription(confidence: BenchmarkConfidence): string {
  switch (confidence) {
    case "high":
      return "The measured transfer rate remained stable during the test.";
    case "medium":
      return "The transfer rate varied moderately; compare trends with care.";
    case "low":
      return "The transfer rate varied substantially; rerun the test under quieter conditions.";
  }
}
