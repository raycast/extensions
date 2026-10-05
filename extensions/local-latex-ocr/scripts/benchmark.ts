import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import katex from "katex";
import { configureOnnxRuntime, InferenceEngine } from "../src/lib/inference";
import { hasBalancedLatex, postProcessLatex } from "../src/lib/latex";
import type { OcrResult } from "../src/types";

type CorpusItem = {
  id: string;
  category: string;
  latex: string;
  imagePath: string;
  variant: string;
};

type BenchmarkRow = CorpusItem & {
  result: OcrResult;
  exact: boolean;
  renderEquivalent: boolean;
};

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const modelDirectory = required(args, "model-dir");
  const backend = (args.backend ?? "auto") as "auto" | "coreml" | "cpu" | "wasm";
  const root = path.resolve(__dirname, "..");
  const corpusPath = args.corpus ?? path.join(root, "work", "corpus-v1", "manifest.json");
  const reportPath = args.report ?? path.join(root, "benchmarks", "latest.md");
  configureOnnxRuntime(path.join(root, "assets", "runtime"), { backend });
  const corpus = JSON.parse(await readFile(corpusPath, "utf8")) as CorpusItem[];

  const processStarted = performance.now();
  const engine = await InferenceEngine.create(modelDirectory);
  const loadMs = performance.now() - processStarted;
  let peakRss = process.memoryUsage().rss;
  const rows: BenchmarkRow[] = [];
  for (const [index, item] of corpus.entries()) {
    const result = await engine.recognize(item.imagePath);
    peakRss = Math.max(peakRss, process.memoryUsage().rss);
    const exact = normalize(result.latex) === normalize(item.latex);
    const renderEquivalent = render(result.latex) === render(item.latex);
    rows.push({ ...item, result, exact, renderEquivalent });
    process.stdout.write(`\r${index + 1}/${corpus.length} ${item.id}`);
  }
  process.stdout.write("\n");

  const firstInferenceMs = rows[0]?.result.elapsedMs ?? 0;
  const latencies = rows.map((row) => row.result.elapsedMs).sort((a, b) => a - b);
  const syntaxValid = rows.filter((row) => row.result.syntaxValid && hasBalancedLatex(row.result.latex)).length;
  const calibration = calibrate(rows);
  const report =
    `# Local LaTeX OCR Benchmark\n\n` +
    `Generated: ${new Date().toISOString()}\n\n` +
    `Corpus: ${rows.length} deterministic printed formulas across 10 categories and 5 image variants. ` +
    `This synthetic corpus is a development baseline, not a substitute for a real paper/PDF validation set.\n\n` +
    `| Metric | Result | v1 gate |\n|---|---:|---:|\n` +
    `| Normalized exact match | ${pct(rows.filter((row) => row.exact).length, rows.length)} | 85% |\n` +
    `| KaTeX render-equivalent | ${pct(rows.filter((row) => row.renderEquivalent).length, rows.length)} | 90% |\n` +
    `| Syntax-valid | ${pct(syntaxValid, rows.length)} | 95% |\n` +
    `| Session load | ${Math.round(loadMs)} ms | — |\n` +
    `| Warm p50 | ${Math.round(percentile(latencies.slice(1), 0.5))} ms | ≤2000 ms |\n` +
    `| Warm p95 | ${Math.round(percentile(latencies.slice(1), 0.95))} ms | ≤5000 ms |\n` +
    `| Cold load + first inference | ${Math.round(loadMs + firstInferenceMs)} ms | ≤10000 ms |\n` +
    `| Peak RSS | ${Math.round(peakRss / 1024 / 1024)} MiB | ≤750 MiB |\n\n` +
    `Backend selected: ${engine.backend}.\n\n` +
    `## Confidence calibration\n\n` +
    `Best grid point with at least 95% render-equivalent precision: mean ≥ ${calibration.mean.toFixed(3)}, ` +
    `minimum ≥ ${calibration.minimum.toFixed(3)}; precision ${pct(calibration.correct, calibration.accepted)}, ` +
    `coverage ${pct(calibration.accepted, rows.length)}.\n\n` +
    `Machine: ${process.platform} ${process.arch}, ${process.version}.\n`;
  await writeFile(reportPath, report);
  await writeFile(
    reportPath.replace(/\.md$/, ".json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), loadMs, peakRss, calibration, rows }, null, 2),
  );
  process.stdout.write(report);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

function normalize(value: string): string {
  return postProcessLatex(value)
    .replaceAll("\\left", "")
    .replaceAll("\\right", "")
    .replace(/\s+/g, "")
    .replaceAll("\\geq", "\\ge")
    .replaceAll("\\leq", "\\le");
}

function render(value: string): string {
  try {
    return katex
      .renderToString(value, { output: "mathml", throwOnError: true })
      .replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return "!invalid";
  }
}

function calibrate(rows: BenchmarkRow[]) {
  const means = [0, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.92, 0.94, 0.95, 0.96, 0.97, 0.98, 0.99, 0.995];
  const minimums = [0, 0.01, 0.03, 0.05, 0.08, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
  let best = { mean: 1, minimum: 1, accepted: 0, correct: 0 };
  for (const mean of means) {
    for (const minimum of minimums) {
      const accepted = rows.filter(
        (row) =>
          row.result.eosReached &&
          row.result.syntaxValid &&
          row.result.meanTokenProbability >= mean &&
          row.result.minimumTokenProbability >= minimum,
      );
      const correct = accepted.filter((row) => row.renderEquivalent).length;
      if (accepted.length && correct / accepted.length >= 0.95 && accepted.length > best.accepted) {
        best = { mean, minimum, accepted: accepted.length, correct };
      }
    }
  }
  return best;
}

function percentile(values: number[], quantile: number): number {
  if (!values.length) return 0;
  return values[Math.min(values.length - 1, Math.floor(values.length * quantile))];
}

function pct(value: number, total: number): string {
  return total ? `${((value / total) * 100).toFixed(1)}%` : "n/a";
}

function parseArgs(values: string[]): Record<string, string> {
  const output: Record<string, string> = {};
  for (let index = 0; index < values.length; index += 2) {
    if (!values[index]?.startsWith("--") || !values[index + 1])
      throw new Error(`Invalid argument near ${values[index] ?? "end"}`);
    output[values[index].slice(2)] = values[index + 1];
  }
  return output;
}

function required(values: Record<string, string>, key: string): string {
  const value = values[key];
  if (!value) throw new Error(`Missing --${key}`);
  return value;
}
