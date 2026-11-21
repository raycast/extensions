import { Glob } from "bun";

const LCOV_PATH = "coverage/lcov.info";
const SOURCE_PATTERN = "src/**/*.{ts,tsx}";

const ignorePatterns = await readIgnorePatterns();
const reported = await readReportedFiles();
const expected = await listSourceFiles(ignorePatterns);
const missing = expected.filter((file) => !reported.has(file));

if (missing.length > 0) {
  console.error("Files without any test coverage:");
  for (const file of missing) {
    console.error(`  ${file}`);
  }
  process.exit(1);
}

async function readIgnorePatterns(): Promise<string[]> {
  const config: unknown = Bun.TOML.parse(await Bun.file("bunfig.toml").text());
  const patterns =
    isRecord(config) && isRecord(config["test"]) ? config["test"]["coveragePathIgnorePatterns"] : undefined;
  if (!Array.isArray(patterns) || !patterns.every((pattern) => typeof pattern === "string")) {
    throw new Error("bunfig.toml must define test.coveragePathIgnorePatterns as a string array");
  }
  return patterns;
}

async function readReportedFiles(): Promise<Set<string>> {
  const lcov = await Bun.file(LCOV_PATH).text();
  return new Set(
    lcov
      .split("\n")
      .filter((line) => line.startsWith("SF:"))
      .map((line) => line.slice("SF:".length)),
  );
}

async function listSourceFiles(excludedPatterns: readonly string[]): Promise<string[]> {
  const excluded = excludedPatterns.map((pattern) => new Glob(pattern));
  const files = await Array.fromAsync(new Glob(SOURCE_PATTERN).scan("."));
  return files.filter((file) => !excluded.some((glob) => glob.match(file))).toSorted();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
