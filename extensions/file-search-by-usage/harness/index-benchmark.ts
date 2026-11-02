import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { rebuildIndex, cloudStorageIndexRoots } from "../src/lib/index-build";
import { findFd } from "../src/lib/fd";
import {
  fdArguments,
  ScanTimings,
  ScanTuning,
  spawnFdDefault,
} from "../src/lib/index-scan";

const limit = positiveInteger(process.env.INDEX_BENCH_ENTRIES, 25_000);
const explicitRoot = process.env.INDEX_BENCH_ROOT?.trim();
const reverse = process.env.INDEX_BENCH_REVERSE === "1";
const mode = process.env.INDEX_BENCH_MODE?.trim();

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function label(tuning: ScanTuning): string {
  return [
    tuning.useSearchPath ? "search-path" : "pattern",
    `fd=${tuning.fdThreads ?? "auto"}`,
    `stat=${tuning.statConcurrency ?? 16}`,
    `batch=${tuning.batchRows ?? 5_000}`,
  ].join(" ");
}

function duration(value: number): string {
  return `${value.toFixed(1)}ms`;
}

async function enumerate(
  fd: string,
  root: string,
  tuning: ScanTuning,
): Promise<{ entries: number; elapsedMs: number }> {
  const args = fdArguments(root, {
    showHidden: true,
    useIgnoreFiles: false,
    fdThreads: tuning.fdThreads,
    useSearchPath: tuning.useSearchPath,
  });
  args.unshift("--max-results", String(limit));
  const started = performance.now();
  let entries = 0;
  for await (const chunk of spawnFdDefault(fd, args)) {
    for (const byte of chunk) if (byte === 0) entries++;
  }
  return { entries, elapsedMs: performance.now() - started };
}

async function build(
  fd: string,
  root: string,
  tuning: ScanTuning,
): Promise<{ entries: number; elapsedMs: number; timings: ScanTimings }> {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "index-benchmark-"));
  const file = path.join(directory, "files.sqlite");
  try {
    const started = performance.now();
    const result = await rebuildIndex({
      file,
      withLock: (work) => work(() => {}),
      lookupFd: () => ({ kind: "found", path: fd, source: "path" }),
      roots: [root],
      maxEntries: limit,
      budgetMs: 180_000,
      showHidden: true,
      useIgnoreFiles: false,
      tuning,
    });
    if (result.kind !== "done") throw new Error(result.message);
    return {
      entries: result.report.indexed,
      elapsedMs: performance.now() - started,
      timings: result.report.timings,
    };
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  const lookup = findFd();
  if (lookup.kind !== "found") throw new Error("fd is unavailable");
  const roots = explicitRoot
    ? [path.resolve(explicitRoot)]
    : await cloudStorageIndexRoots();
  const root =
    roots.find((candidate) =>
      path.basename(candidate).startsWith("GoogleDrive"),
    ) ?? roots[0];
  if (!root) throw new Error("No benchmark root is available");

  console.log(
    `Benchmarking one mounted scope, capped at ${limit.toLocaleString()} entries.`,
  );
  console.log("Paths and filenames are intentionally not printed.\n");

  console.log("Enumeration only");
  let enumerationCases: ScanTuning[] = [
    {},
    { useSearchPath: true },
    ...[1, 2, 4, 8, 16, 32].map((fdThreads) => ({ fdThreads })),
  ];
  if (reverse) enumerationCases = enumerationCases.reverse();
  for (const tuning of enumerationCases) {
    const result = await enumerate(lookup.path, root, tuning);
    console.log(
      `${label(tuning).padEnd(43)} ${String(result.entries).padStart(7)} entries  ${duration(result.elapsedMs)}`,
    );
  }

  if (mode === "enumeration") return;

  console.log("\nEnd-to-end bounded builds");
  let buildCases: ScanTuning[] = [
    {},
    ...[4, 8, 32, 64].map((statConcurrency) => ({ statConcurrency })),
    ...[250, 500, 1_000, 2_000].map((batchRows) => ({ batchRows })),
    { statConcurrency: 32, batchRows: 5_000 },
  ];
  if (reverse) buildCases = buildCases.reverse();
  for (const tuning of buildCases) {
    const result = await build(lookup.path, root, tuning);
    const measured =
      result.timings.enumerationMs +
      result.timings.metadataMs +
      result.timings.databaseMs +
      result.timings.ftsMs;
    console.log(
      [
        label(tuning).padEnd(43),
        `${String(result.entries).padStart(7)} entries`,
        `wall ${duration(result.elapsedMs)}`,
        `enum ${duration(result.timings.enumerationMs)}`,
        `meta ${duration(result.timings.metadataMs)}`,
        `db ${duration(result.timings.databaseMs)}`,
        `fts ${duration(result.timings.ftsMs)}`,
        `other ${duration(Math.max(0, result.elapsedMs - measured))}`,
      ].join("  "),
    );
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
