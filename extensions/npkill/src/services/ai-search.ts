import { basename, dirname } from "node:path";
import { Artifact, ScanOptions } from "../types";
import { buildArguments, detectCli } from "./npkill-cli";
import { scan } from "./scan-manager";
import { validateRoot } from "./path-validation";
import { Sort, sorts, visibleArtifacts } from "../utils/artifacts";

export interface ArtifactSearch {
  query?: string;
  directory?: string;
  profiles?: string;
  minimumSizeBytes?: number;
  minimumInactiveDays?: number;
  risk?: "all" | "review" | "sensitive" | "unknown";
  sort?: Sort;
  limit?: number;
}

export interface ArtifactSearchReport {
  root: string;
  profiles: string[];
  includeSensitiveResults: boolean;
  startedAt: string;
  finishedAt: string;
  scanComplete: boolean;
  stopReason: "complete" | "time-limit" | "candidate-limit" | "canceled" | "failed";
  error: string | null;
  warnings: string[];
  warningCount: number;
  scannedCount: number;
  matchingCount: number;
  returnedCount: number;
  resultsTruncated: boolean;
  limit: number;
  timeoutSeconds: number;
  matchingEstimatedBytes: number;
  matchingUnknownSizeCount: number;
  results: {
    path: string;
    directoryName: string;
    projectPath: string;
    estimatedSizeBytes: number | null;
    projectModificationTime: string | null;
    inactiveDays: number | null;
    risk: Artifact["risk"];
    riskReason: string | null;
  }[];
  cleanupGuidance: string;
}

export const CLEANUP_GUIDANCE =
  "Open Scan Development Artifacts in Raycast, configure the same directory and profiles, review fresh results, and confirm the exact paths there. AI tools cannot move or delete files.";

function validateInput(input: ArtifactSearch): void {
  for (const key of ["query", "directory", "profiles"] as const) {
    if (input[key] !== undefined && (typeof input[key] !== "string" || input[key].includes("\0")))
      throw new Error(`${key} must be text without null characters.`);
  }
  for (const key of ["minimumSizeBytes", "minimumInactiveDays"] as const) {
    const value = input[key];
    if (
      value !== undefined &&
      (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER)
    )
      throw new Error(`${key} must be a finite nonnegative number.`);
  }
  if (input.limit !== undefined && (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 100))
    throw new Error("limit must be an integer from 1 to 100.");
  if (input.sort !== undefined && !Object.hasOwn(sorts, input.sort)) throw new Error("Unsupported sort order.");
  if (input.risk !== undefined && !["all", "review", "sensitive", "unknown"].includes(input.risk))
    throw new Error("Unsupported risk filter.");
}

export function searchOptions(input: ArtifactSearch, saved?: ScanOptions): ScanOptions {
  validateInput(input);
  const root = input.directory ?? saved?.root;
  if (!root?.trim())
    throw new Error(
      "Choose a directory in Scan Development Artifacts first, or provide an explicit directory. No scan root is assumed.",
    );
  return {
    root,
    profiles: input.profiles ?? saved?.profiles ?? "node",
    executable: saved?.executable ?? "",
    config: saved?.config ?? "",
    exclusions: saved?.exclusions ?? "",
    includeSensitive: saved?.includeSensitive ?? false,
  };
}

/** Read-only scan. Injectable execution limits allow deterministic lifecycle tests. */
export async function searchArtifacts(
  input: ArtifactSearch,
  saved?: ScanOptions,
  execution: { run?: typeof scan; timeoutMs?: number; maxCandidates?: number } = {},
): Promise<ArtifactSearchReport> {
  const options = searchOptions(input, saved);
  buildArguments(options);
  const limit = input.limit ?? 30;
  const timeoutMs = execution.timeoutMs ?? 20000;
  const maxCandidates = execution.maxCandidates ?? 20000;
  const controller = new AbortController();
  let stopReason: "complete" | "time-limit" | "candidate-limit" | "canceled" | "failed" = "complete";
  const timer = setTimeout(() => {
    stopReason = "time-limit";
    controller.abort();
  }, timeoutMs);
  const artifacts = new Map<string, Artifact>();
  const warnings: string[] = [];
  let warningCount = 0;
  let root = options.root;
  let error: string | null = null;
  const startedAt = new Date().toISOString();
  try {
    const result = await (execution.run ?? scan)(options, controller.signal, {
      onRoot: (value) => {
        root = value.path;
      },
      onArtifact: (artifact) => {
        if (controller.signal.aborted || artifacts.has(artifact.path)) return;
        artifacts.set(artifact.path, artifact);
        if (artifacts.size >= maxCandidates) {
          stopReason = "candidate-limit";
          controller.abort();
        }
      },
      onWarning: (message) => {
        warningCount++;
        if (warnings.length < 20) warnings.push(message.slice(0, 2000));
      },
    });
    if (result === "canceled" && !controller.signal.aborted) stopReason = "canceled";
  } catch (failure) {
    if (!controller.signal.aborted) {
      stopReason = "failed";
      error = failure instanceof Error ? failure.message : String(failure);
    }
  } finally {
    clearTimeout(timer);
  }
  const now = Date.now();
  const matches = visibleArtifacts(
    [...artifacts.values()],
    input.query ?? "",
    "all",
    input.sort ?? "largest",
    now,
  ).filter((item) => {
    if (input.minimumSizeBytes !== undefined && (item.size === null || item.size <= input.minimumSizeBytes))
      return false;
    if (
      input.minimumInactiveDays !== undefined &&
      (item.activity === null || (now - item.activity) / 86400000 <= input.minimumInactiveDays)
    )
      return false;
    return !input.risk || input.risk === "all" || item.risk === input.risk;
  });
  return {
    root,
    profiles: options.profiles.split(",").map((value) => value.trim()),
    includeSensitiveResults: options.includeSensitive,
    startedAt,
    finishedAt: new Date(now).toISOString(),
    scanComplete: stopReason === "complete" && warningCount === 0,
    stopReason,
    error,
    warnings,
    warningCount,
    scannedCount: artifacts.size,
    matchingCount: matches.length,
    returnedCount: Math.min(matches.length, limit),
    resultsTruncated: matches.length > limit,
    limit,
    timeoutSeconds: timeoutMs / 1000,
    matchingEstimatedBytes: matches.reduce((total, item) => total + (item.size ?? 0), 0),
    matchingUnknownSizeCount: matches.filter((item) => item.size === null).length,
    results: matches.slice(0, limit).map((item) => ({
      path: item.path,
      directoryName: basename(item.path),
      projectPath: dirname(item.path),
      estimatedSizeBytes: item.size,
      projectModificationTime: item.activity === null ? null : new Date(item.activity).toISOString(),
      inactiveDays: item.activity === null ? null : Math.floor((now - item.activity) / 86400000),
      risk: item.risk,
      riskReason: item.reason ?? null,
    })),
    cleanupGuidance: CLEANUP_GUIDANCE,
  };
}

export async function checkSetup(saved?: ScanOptions) {
  const problems: string[] = [];
  let cliCompatible = false;
  if (!saved) problems.push("Run Scan Development Artifacts to save a directory and npkill settings.");
  if (saved) {
    try {
      await validateRoot(saved.root);
      buildArguments(saved);
    } catch (error) {
      problems.push(error instanceof Error ? error.message : String(error));
    }
  }
  try {
    await detectCli(saved?.executable ?? "", AbortSignal.timeout(10000));
    cliCompatible = true;
  } catch (error) {
    problems.push(error instanceof Error ? error.message : String(error));
  }
  return {
    configured: !!saved,
    cliCompatible,
    ready: problems.length === 0,
    root: saved?.root ?? null,
    profiles: saved?.profiles ?? "node",
    includeSensitiveResults: saved?.includeSensitive ?? false,
    exclusions: saved?.exclusions ?? "",
    configPath: saved?.config || null,
    problems,
    cleanupGuidance: CLEANUP_GUIDANCE,
  };
}
