import { execFile } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";
import { getPreferenceValues } from "@raycast/api";

/**
 * Thin, defensive wrapper around the `ccusage` CLI.
 *
 * We shell out to `npx ccusage blocks --json` (or `bunx`, per preference) and
 * parse the ACTIVE 5-hour block. The ccusage JSON shape has changed across
 * versions, so every field is read through a guarded accessor and the whole
 * thing degrades to `null` rather than throwing.
 */

export type CcusageTokenCounts = {
  input: number | null;
  output: number | null;
  cacheCreate: number | null;
  cacheRead: number | null;
  total: number | null;
};

export type CcusageBurnRate = {
  /** Tokens per minute across the active block. */
  tokensPerMinute: number | null;
  /** Estimated USD spend per hour at the current rate. */
  costPerHour: number | null;
};

export type CcusageProjection = {
  /** Minutes until the active block's projected limit/exhaustion. */
  remainingMinutes: number | null;
  totalTokens: number | null;
  totalCost: number | null;
};

export type CcusageActiveBlock = {
  startTime: Date | null;
  endTime: Date | null;
  costUSD: number | null;
  tokens: CcusageTokenCounts;
  burnRate: CcusageBurnRate;
  projection: CcusageProjection;
  models: string[];
  /** Per-model token totals when ccusage exposes them; otherwise empty. */
  perModelTokens: { model: string; tokens: number }[];
  entries: number | null;
};

export type CcusageResult =
  | { ok: true; block: CcusageActiveBlock | null }
  | {
      ok: false;
      reason: "missing" | "timeout" | "parse" | "error";
      message: string;
    };

const TIMEOUT_MS = 15_000;

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function date(value: unknown): Date | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Read the first present numeric field from a list of candidate keys. */
function pickNum(
  obj: Record<string, unknown> | undefined,
  keys: string[],
): number | null {
  if (!obj) return null;
  for (const key of keys) {
    const v = num(obj[key]);
    if (v != null) return v;
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined;
}

function parseBlock(raw: Record<string, unknown>): CcusageActiveBlock {
  const tokenCounts = asRecord(raw.tokenCounts) ?? asRecord(raw.tokens) ?? {};
  const burnRate = asRecord(raw.burnRate) ?? {};
  const projection = asRecord(raw.projection) ?? {};

  const tokens: CcusageTokenCounts = {
    input: pickNum(tokenCounts, ["inputTokens", "input", "input_tokens"]),
    output: pickNum(tokenCounts, ["outputTokens", "output", "output_tokens"]),
    cacheCreate: pickNum(tokenCounts, [
      "cacheCreationInputTokens",
      "cacheCreation",
      "cache_creation_input_tokens",
    ]),
    cacheRead: pickNum(tokenCounts, [
      "cacheReadInputTokens",
      "cacheRead",
      "cache_read_input_tokens",
    ]),
    total: pickNum(raw, ["totalTokens", "total_tokens"]),
  };

  // Derive a total if ccusage did not provide one directly.
  if (tokens.total == null) {
    const parts = [
      tokens.input,
      tokens.output,
      tokens.cacheCreate,
      tokens.cacheRead,
    ].filter((n): n is number => n != null);
    tokens.total = parts.length > 0 ? parts.reduce((a, b) => a + b, 0) : null;
  }

  const models = Array.isArray(raw.models)
    ? raw.models.filter((m): m is string => typeof m === "string")
    : [];

  // Some ccusage versions expose a per-model breakdown under `modelBreakdowns`.
  const perModelTokens: { model: string; tokens: number }[] = [];
  const breakdowns = raw.modelBreakdowns ?? raw.modelBreakdown ?? raw.perModel;
  if (Array.isArray(breakdowns)) {
    for (const entry of breakdowns) {
      const rec = asRecord(entry);
      if (!rec) continue;
      const model =
        typeof rec.modelName === "string"
          ? rec.modelName
          : typeof rec.model === "string"
            ? rec.model
            : null;
      const t =
        pickNum(rec, ["totalTokens", "total_tokens"]) ??
        (() => {
          const parts = [
            pickNum(rec, ["inputTokens", "input"]),
            pickNum(rec, ["outputTokens", "output"]),
            pickNum(rec, ["cacheCreationInputTokens"]),
            pickNum(rec, ["cacheReadInputTokens"]),
          ].filter((n): n is number => n != null);
          return parts.length ? parts.reduce((a, b) => a + b, 0) : null;
        })();
      if (model && t != null) perModelTokens.push({ model, tokens: t });
    }
  }

  return {
    startTime: date(raw.startTime),
    endTime: date(raw.endTime),
    costUSD: pickNum(raw, ["costUSD", "totalCost", "cost"]),
    tokens,
    burnRate: {
      tokensPerMinute: pickNum(burnRate, [
        "tokensPerMinute",
        "tokens_per_minute",
      ]),
      costPerHour: pickNum(burnRate, ["costPerHour", "cost_per_hour"]),
    },
    projection: {
      remainingMinutes: pickNum(projection, [
        "remainingMinutes",
        "remaining_minutes",
      ]),
      totalTokens: pickNum(projection, ["totalTokens", "total_tokens"]),
      totalCost: pickNum(projection, ["totalCost", "total_cost"]),
    },
    models,
    perModelTokens,
    entries: pickNum(raw, ["entries"]),
  };
}

/**
 * Common locations where node/npx/bun live. Raycast runs extensions with a
 * minimal PATH (typically /usr/bin:/bin:/usr/sbin:/sbin) that does NOT include
 * Homebrew or version-manager dirs, so a bare `npx` fails to resolve here even
 * though it works in the user's terminal.
 */
function nodeBinDirs(): string[] {
  const home = homedir();
  return [
    "/opt/homebrew/bin", // Apple Silicon Homebrew
    "/usr/local/bin", // Intel Homebrew / generic
    "/opt/local/bin", // MacPorts
    join(home, ".bun", "bin"),
    join(home, ".volta", "bin"),
    join(home, ".local", "bin"),
    "/run/current-system/sw/bin", // Nix
  ];
}

/**
 * Current PATH widened with the standard system dirs AND common node locations
 * (deduped). The system dirs are essential: Raycast can hand the extension a
 * PATH that lacks `/bin`, and `npm`/`npx` internally `spawn('sh', …)` — without
 * `/bin` on PATH that spawn fails with `spawn sh ENOENT`.
 */
function augmentedPath(): string {
  const systemDirs = ["/usr/bin", "/bin", "/usr/sbin", "/sbin"];
  const current = process.env.PATH ? process.env.PATH.split(delimiter) : [];
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const dir of [...current, ...systemDirs, ...nodeBinDirs()]) {
    if (dir && !seen.has(dir)) {
      seen.add(dir);
      merged.push(dir);
    }
  }
  return merged.join(delimiter);
}

/** Resolve `npx`/`bunx` to an absolute path when we can find it on disk. */
function resolveRunner(runner: string): string {
  for (const dir of nodeBinDirs()) {
    const candidate = join(dir, runner);
    if (existsSync(candidate)) return candidate;
  }
  return runner; // fall back to the bare name (relies on PATH)
}

/** Cached absolute path to a directly-runnable ccusage binary, once found. */
let cachedCcusageBin: string | undefined;

/**
 * Locate a ccusage executable we can invoke DIRECTLY, skipping the package
 * runner. `npx ccusage` pays ~0.5s of pure wrapper overhead on every call
 * (node → npm-cli → package resolution → spawn); calling the resolved binary is
 * ~5× faster. We look in the standard node bin dirs (a global install) and in
 * npx's on-disk cache (`~/.npm/_npx/<hash>/node_modules/.bin/ccusage`).
 *
 * Returns `undefined` on the very first run, before ccusage is installed — the
 * caller then falls back to `npx`/`bunx ccusage`, which installs it, so the
 * NEXT call resolves directly. Only positive hits are memoized, so that
 * first-run fallback is re-attempted (cheaply) until the binary appears.
 */
function findCcusageBinary(): string | undefined {
  if (cachedCcusageBin) return cachedCcusageBin;

  // 1. A globally-installed `ccusage` on a known bin dir.
  for (const dir of nodeBinDirs()) {
    const candidate = join(dir, "ccusage");
    if (existsSync(candidate)) return (cachedCcusageBin = candidate);
  }

  // 2. npx's package cache: ~/.npm/_npx/<hash>/node_modules/.bin/ccusage.
  // The <hash> is derived from the package spec, so it is stable across runs;
  // we glob it rather than hard-coding the hash.
  try {
    const npxRoot = join(homedir(), ".npm", "_npx");
    for (const entry of readdirSync(npxRoot)) {
      const candidate = join(npxRoot, entry, "node_modules", ".bin", "ccusage");
      if (existsSync(candidate)) return (cachedCcusageBin = candidate);
    }
  } catch {
    // _npx dir absent or unreadable — fine, fall through to the runner.
  }

  return undefined;
}

function runCcusage(
  runner: string,
  configDir: string,
  sub: string,
  extraArgs: string[] = [],
): Promise<string> {
  // Prefer the resolved binary; otherwise the runner installs/runs it for us.
  const bin = findCcusageBinary();
  const file = bin ?? resolveRunner(runner);
  // `--offline` skips ccusage's per-call network fetch of model pricing (it
  // ships bundled pricing) — a consistent latency win, and fine for what is
  // already an estimate. The binary's shebang (`env node`) still relies on the
  // augmented PATH below to find `node`.
  const args = [
    ...(bin ? [] : ["ccusage"]),
    sub,
    "--json",
    "--offline",
    ...extraArgs,
  ];
  return new Promise((resolve, reject) => {
    const child = execFile(
      file,
      args,
      {
        timeout: TIMEOUT_MS,
        maxBuffer: 16 * 1024 * 1024,
        // Run from a real, existing directory — Raycast may launch the extension
        // with cwd `/`, which can trip up npm's internal spawns.
        cwd: homedir(),
        // Raycast's minimal PATH omits Homebrew/version-manager dirs, so we both
        // resolve the runner to an absolute path AND widen PATH so it (and the
        // `node` it spawns) can be found. Also make ccusage non-interactive.
        env: {
          ...process.env,
          PATH: augmentedPath(),
          CLAUDE_CONFIG_DIR: configDir,
          CI: "1",
          NO_COLOR: "1",
        },
      },
      (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(stdout);
      },
    );
    child.on("error", reject);
  });
}

/** Locate the active block in a parsed ccusage payload. */
function findActiveBlock(parsed: unknown): Record<string, unknown> | null {
  const root = asRecord(parsed);
  const blocksValue = root?.blocks ?? parsed;
  if (!Array.isArray(blocksValue)) return null;

  const records = blocksValue
    .map(asRecord)
    .filter((b): b is Record<string, unknown> => Boolean(b));
  const active = records.find((b) => b.isActive === true && b.isGap !== true);
  if (active) return active;

  // Fall back to the most recent non-gap block if none is flagged active.
  const nonGap = records.filter((b) => b.isGap !== true);
  return nonGap.length ? nonGap[nonGap.length - 1] : null;
}

/**
 * Run ccusage and return the parsed active block. Never throws: failures are
 * surfaced as a structured `{ ok: false, reason }` result for the UI to render.
 */
type CcusageRunError = {
  ok: false;
  reason: "missing" | "timeout" | "parse" | "error";
  message: string;
};

/** Run a ccusage subcommand, JSON-parse stdout, and map failures uniformly. */
async function runCcusageJson(
  sub: string,
  extraArgs: string[] = [],
  configDirOverride?: string,
): Promise<{ ok: true; parsed: unknown } | CcusageRunError> {
  const prefs = getPreferenceValues<Preferences>();
  const runner = prefs.ccusageRunner === "bunx" ? "bunx" : "npx";
  const configDir =
    configDirOverride && configDirOverride.trim()
      ? configDirOverride.trim()
      : resolveConfigDir(prefs.claudeConfigDir);

  let stdout: string;
  try {
    stdout = await runCcusage(runner, configDir, sub, extraArgs);
  } catch (err) {
    const e = err as NodeJS.ErrnoException & {
      killed?: boolean;
      signal?: string;
    };
    if (e.code === "ENOENT") {
      return {
        ok: false,
        reason: "missing",
        message: `Could not find \`${runner}\` on Raycast's PATH (searched Homebrew & common Node locations). Install Node/Bun, or switch the ccusage runner in preferences.`,
      };
    }
    if (e.killed || e.signal === "SIGTERM") {
      return {
        ok: false,
        reason: "timeout",
        message: `\`${runner} ccusage\` took longer than ${TIMEOUT_MS / 1000}s. It may still be downloading on first run — try Refresh.`,
      };
    }
    return {
      ok: false,
      reason: "error",
      message: e.message || "ccusage failed to run.",
    };
  }

  try {
    return { ok: true, parsed: JSON.parse(stdout) };
  } catch {
    return {
      ok: false,
      reason: "parse",
      message: "ccusage returned output that could not be parsed as JSON.",
    };
  }
}

/**
 * Run ccusage and return the parsed active block. Never throws: failures are
 * surfaced as a structured `{ ok: false, reason }` result for the UI to render.
 */
export async function getCcusageActiveBlock(): Promise<CcusageResult> {
  const res = await runCcusageJson("blocks");
  if (!res.ok) return res;
  const block = findActiveBlock(res.parsed);
  return { ok: true, block: block ? parseBlock(block) : null };
}

export type CcusageWeek = {
  /** Week-start date as ccusage reports it, e.g. `2026-06-29`. */
  period: string | null;
  totalTokens: number | null;
  /** Estimated API-equivalent cost (USD) of this week's tokens. */
  totalCost: number | null;
};

export type CcusageWeekResult =
  { ok: true; week: CcusageWeek | null } | CcusageRunError;

/**
 * Run `ccusage weekly --json` and return the CURRENT week (the last bucket),
 * for showing this week's total tokens and their estimated cost.
 */
export async function getThisWeekUsage(): Promise<CcusageWeekResult> {
  const res = await runCcusageJson("weekly");
  if (!res.ok) return res;

  const root = asRecord(res.parsed);
  const weeklyVal = root?.weekly;
  const weeks = Array.isArray(weeklyVal) ? weeklyVal : [];
  const records = weeks
    .map(asRecord)
    .filter((w): w is Record<string, unknown> => Boolean(w));
  if (records.length === 0) return { ok: true, week: null };

  const last = records[records.length - 1];
  return {
    ok: true,
    week: {
      period: typeof last.period === "string" ? last.period : null,
      totalTokens: pickNum(last, ["totalTokens", "total_tokens"]),
      totalCost: pickNum(last, ["totalCost", "total_cost", "costUSD", "cost"]),
    },
  };
}

/** Estimated per-model usage for a billing period (month or day). */
export type ModelUsage = {
  /** Raw model id, e.g. "claude-opus-4-8" (or a dated variant). */
  model: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  /** Estimated USD cost as reported by ccusage. */
  costUSD: number;
};

/** Aggregated usage for a single period bucket plus its per-model breakdown. */
export type PeriodUsage = {
  /** Bucket label, e.g. "2026-06" for a month or "2026-06-29" for a day. */
  label: string;
  totalCostUSD: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  /** Per-model rows, sorted DESC by costUSD. */
  models: ModelUsage[];
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Local year-month label, e.g. "2026-06". */
function localYearMonth(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

/** Local calendar date label, e.g. "2026-06-29". */
function localDate(d: Date): string {
  return `${localYearMonth(d)}-${pad2(d.getDate())}`;
}

/** First array found among candidate keys; `[]` when none present. */
function pickArray(
  obj: Record<string, unknown> | undefined,
  keys: string[],
): unknown[] {
  if (!obj) return [];
  for (const key of keys) {
    const v = obj[key];
    if (Array.isArray(v)) return v;
  }
  return [];
}

/** Extract the period/date label from a bucket record, tolerating spellings. */
function entryPeriod(rec: Record<string, unknown>): string | null {
  for (const key of ["period", "date", "month", "day"]) {
    const v = rec[key];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

/** Coalesce the various per-model row shapes into a `ModelUsage`. */
function parseModelRow(raw: unknown): ModelUsage | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const model =
    typeof rec.modelName === "string"
      ? rec.modelName
      : typeof rec.model === "string"
        ? rec.model
        : typeof rec.name === "string"
          ? rec.name
          : "";
  const inputTokens =
    pickNum(rec, ["inputTokens", "input", "input_tokens"]) ?? 0;
  const outputTokens =
    pickNum(rec, ["outputTokens", "output", "output_tokens"]) ?? 0;
  const cacheCreationTokens =
    pickNum(rec, [
      "cacheCreationTokens",
      "cacheCreationInputTokens",
      "cacheCreation",
      "cache_creation_input_tokens",
    ]) ?? 0;
  const cacheReadTokens =
    pickNum(rec, [
      "cacheReadTokens",
      "cacheReadInputTokens",
      "cacheRead",
      "cache_read_input_tokens",
    ]) ?? 0;
  const totalTokens =
    pickNum(rec, ["totalTokens", "total_tokens"]) ??
    inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens;
  const costUSD =
    pickNum(rec, ["costUSD", "totalCost", "cost", "cost_usd"]) ?? 0;

  // Drop rows carrying no signal at all (e.g. bare string ids that slipped in).
  if (
    model === "" &&
    totalTokens === 0 &&
    costUSD === 0 &&
    inputTokens === 0 &&
    outputTokens === 0
  ) {
    return null;
  }
  return {
    model,
    totalTokens,
    inputTokens,
    outputTokens,
    cacheCreationTokens,
    cacheReadTokens,
    costUSD,
  };
}

function sumModels(
  models: ModelUsage[],
  pick: (m: ModelUsage) => number,
): number {
  return models.reduce((acc, m) => acc + pick(m), 0);
}

/** Build a `PeriodUsage` from a bucket record, or a zeroed one when absent. */
function buildPeriodUsage(
  entry: Record<string, unknown> | null,
  fallbackLabel: string,
): PeriodUsage {
  if (!entry) {
    return {
      label: fallbackLabel,
      totalCostUSD: 0,
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      models: [],
    };
  }

  const label = entryPeriod(entry) ?? fallbackLabel;

  const rowsRaw =
    entry.modelBreakdowns ??
    entry.modelBreakdown ??
    entry.breakdowns ??
    entry.breakdown ??
    entry.perModel ??
    entry.models;
  const allModels: ModelUsage[] = [];
  if (Array.isArray(rowsRaw)) {
    for (const row of rowsRaw) {
      const parsed = parseModelRow(row);
      if (parsed) allModels.push(parsed);
    }
  }

  // Claude-only: this is a Claude-focused tool ("Claude Gauge"), but ccusage may
  // aggregate OTHER agents into the same buckets (e.g. "gpt-5.4", "codex-*").
  // Keep only models whose id starts with "claude", and derive ALL period totals
  // by summing THESE rows — the bucket-level `totals` ccusage reports would
  // otherwise include non-Claude spend. (sumModels yields 0 for an empty set, so
  // no NaN.)
  const models = allModels.filter((m) =>
    m.model.toLowerCase().startsWith("claude"),
  );
  models.sort((a, b) => b.costUSD - a.costUSD);

  const inputTokens = sumModels(models, (m) => m.inputTokens);
  const outputTokens = sumModels(models, (m) => m.outputTokens);
  const cacheCreationTokens = sumModels(models, (m) => m.cacheCreationTokens);
  const cacheReadTokens = sumModels(models, (m) => m.cacheReadTokens);
  const totalTokens = sumModels(models, (m) => m.totalTokens);
  const totalCostUSD = sumModels(models, (m) => m.costUSD);

  return {
    label,
    totalCostUSD,
    totalTokens,
    inputTokens,
    outputTokens,
    cacheCreationTokens,
    cacheReadTokens,
    models,
  };
}

/**
 * Run `ccusage monthly --json --breakdown` and return the CURRENT month's
 * usage with a per-model cost breakdown. Picks the bucket matching the current
 * year-month, else the last bucket; returns a zeroed `PeriodUsage` on failure.
 */
export async function getThisMonthUsage(
  configDir?: string,
): Promise<PeriodUsage> {
  const label = localYearMonth(new Date());
  const res = await runCcusageJson("monthly", ["--breakdown"], configDir);
  if (!res.ok) return buildPeriodUsage(null, label);

  const root = asRecord(res.parsed);
  const records = pickArray(root, ["monthly", "data"])
    .map(asRecord)
    .filter((r): r is Record<string, unknown> => Boolean(r));
  if (records.length === 0) return buildPeriodUsage(null, label);

  const match =
    records.find((r) => entryPeriod(r) === label) ??
    records[records.length - 1];
  return buildPeriodUsage(match, label);
}

/**
 * Run `ccusage daily --json --breakdown` and return TODAY's usage with a
 * per-model cost breakdown. Picks the bucket matching today's date, else the
 * last bucket; returns a zeroed `PeriodUsage` on failure.
 */
export async function getTodayUsage(configDir?: string): Promise<PeriodUsage> {
  const label = localDate(new Date());
  const res = await runCcusageJson("daily", ["--breakdown"], configDir);
  if (!res.ok) return buildPeriodUsage(null, label);

  const root = asRecord(res.parsed);
  const records = pickArray(root, ["daily", "data"])
    .map(asRecord)
    .filter((r): r is Record<string, unknown> => Boolean(r));
  if (records.length === 0) return buildPeriodUsage(null, label);

  const match =
    records.find((r) => entryPeriod(r) === label) ??
    records[records.length - 1];
  return buildPeriodUsage(match, label);
}

function resolveConfigDir(pref: string | undefined): string {
  const fromEnv = process.env.CLAUDE_CONFIG_DIR;
  const dir = (pref && pref.trim()) || (fromEnv && fromEnv.trim());
  if (dir) return dir;
  const home = process.env.HOME || process.env.USERPROFILE || "";
  return `${home}/.claude`;
}
