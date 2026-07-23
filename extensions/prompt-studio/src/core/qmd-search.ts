import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  access,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { constants } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import type { PromptRecord } from "./prompt-store.ts";
import { promptLibraryFingerprint, type SearchResult } from "./search-index.ts";

const execFileAsync = promisify(execFile);
const QMD_INDEX = "prompt-studio";
const QMD_COLLECTION = "prompt-studio";
const UUID =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

export interface QmdCommandResult {
  stdout: string;
  stderr: string;
}

export type QmdRunner = (
  executable: string,
  args: readonly string[],
  timeoutMs?: number,
) => Promise<QmdCommandResult>;

export interface QmdHealth {
  state: "healthy" | "stale" | "unavailable";
  executable: string;
  version?: string;
  collectionPath?: string;
  documentCount: number;
  vectorCount: number;
  lastUpdated?: string;
  message: string;
}

export interface QmdSearchResult extends SearchResult {
  semanticScore: number;
  file: string;
}

interface QmdState {
  schemaVersion: 1;
  libraryFingerprint: string;
  collectionPath: string;
  qmdVersion: string;
  documentCount: number;
  vectorCount: number;
  updatedAt: string;
}

interface RawQmdResult {
  file: string;
  score: number;
  semanticScore: number;
}

let activeQmdRefresh:
  | {
      key: string;
      promise: Promise<QmdHealth>;
    }
  | undefined;

export async function resolveQmdExecutable(
  configured?: string,
): Promise<string> {
  const requested = configured?.trim();
  if (requested) {
    const expanded = requested.startsWith("~/")
      ? join(homedir(), requested.slice(2))
      : requested;
    if (!expanded.includes("/")) return expanded;
    const absolute = resolve(expanded);
    await access(absolute, constants.X_OK);
    return absolute;
  }

  const candidates = [
    join(homedir(), ".bun", "bin", "qmd"),
    join(homedir(), ".npm-global", "bin", "qmd"),
    "/opt/homebrew/bin/qmd",
    "/usr/local/bin/qmd",
  ];
  for (const candidate of candidates) {
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Continue to the next conventional installation path.
    }
  }
  return "qmd";
}

export function qmdStatePath(): string {
  return join(
    homedir(),
    "Library",
    "Application Support",
    "Prompt Studio",
    "qmd-state.json",
  );
}

export async function inspectQmd(
  directory: string,
  records: readonly PromptRecord[],
  configuredExecutable?: string,
  runner: QmdRunner = runQmd,
  statePath = qmdStatePath(),
): Promise<QmdHealth> {
  let executable = configuredExecutable?.trim() || "qmd";
  try {
    executable = await resolveQmdExecutable(configuredExecutable);
    const versionOutput = await runner(executable, ["--version"], 5_000);
    const version = versionOutput.stdout.trim();
    const collection = await runner(
      executable,
      ["--index", QMD_INDEX, "collection", "show", QMD_COLLECTION],
      5_000,
    );
    const collectionPath = collection.stdout.match(/^\s*Path:\s+(.+)$/m)?.[1];
    if (!collectionPath) {
      return unavailable(
        executable,
        version,
        "Prompt collection is not configured.",
      );
    }
    if (resolve(collectionPath) !== resolve(directory)) {
      return {
        ...unavailable(
          executable,
          version,
          "Prompt collection points at a different directory.",
        ),
        state: "stale",
        collectionPath,
      };
    }

    const status = await runner(
      executable,
      ["--index", QMD_INDEX, "status"],
      5_000,
    );
    const documentCount = numberFrom(
      status.stdout,
      /Total:\s+(\d+) files indexed/,
    );
    const vectorCount = numberFrom(status.stdout, /Vectors:\s+(\d+) embedded/);
    const saved = await readQmdState(statePath);
    const fingerprint = promptLibraryFingerprint([...records]);
    const stale =
      !saved ||
      saved.libraryFingerprint !== fingerprint ||
      saved.collectionPath !== resolve(directory) ||
      documentCount !== records.length ||
      vectorCount < records.length;

    return {
      state: stale ? "stale" : "healthy",
      executable,
      version,
      collectionPath,
      documentCount,
      vectorCount,
      ...(saved?.updatedAt ? { lastUpdated: saved.updatedAt } : {}),
      message: stale
        ? "Prompt files changed since QMD was refreshed."
        : "Meaning-based search is indexed and ready.",
    };
  } catch (error) {
    return unavailable(executable, undefined, qmdError(error));
  }
}

export async function ensureQmd(
  directory: string,
  records: readonly PromptRecord[],
  configuredExecutable?: string,
  runner: QmdRunner = runQmd,
  statePath = qmdStatePath(),
): Promise<QmdHealth> {
  const health = await inspectQmd(
    directory,
    records,
    configuredExecutable,
    runner,
    statePath,
  );
  if (health.state === "healthy") return health;
  return rebuildQmd(
    directory,
    records,
    configuredExecutable,
    runner,
    statePath,
  );
}

export async function rebuildQmd(
  directory: string,
  records: readonly PromptRecord[],
  configuredExecutable?: string,
  runner: QmdRunner = runQmd,
  statePath = qmdStatePath(),
): Promise<QmdHealth> {
  const key = `${resolve(directory)}\0${configuredExecutable?.trim() ?? ""}`;
  if (activeQmdRefresh) {
    if (activeQmdRefresh.key === key) return activeQmdRefresh.promise;
    await activeQmdRefresh.promise.catch(() => undefined);
    return rebuildQmd(
      directory,
      records,
      configuredExecutable,
      runner,
      statePath,
    );
  }

  const promise = performQmdRebuild(
    directory,
    records,
    configuredExecutable,
    runner,
    statePath,
  );
  activeQmdRefresh = { key, promise };
  try {
    return await promise;
  } finally {
    if (activeQmdRefresh?.promise === promise) activeQmdRefresh = undefined;
  }
}

async function performQmdRebuild(
  directory: string,
  records: readonly PromptRecord[],
  configuredExecutable: string | undefined,
  runner: QmdRunner,
  statePath: string,
): Promise<QmdHealth> {
  const executable = await resolveQmdExecutable(configuredExecutable);
  const version = (
    await runner(executable, ["--version"], 5_000)
  ).stdout.trim();
  const collection = await runner(
    executable,
    ["--index", QMD_INDEX, "collection", "list"],
    5_000,
  );
  const hasCollection = new RegExp(`^${QMD_COLLECTION} \\(`, "m").test(
    collection.stdout,
  );

  if (hasCollection) {
    const shown = await runner(
      executable,
      ["--index", QMD_INDEX, "collection", "show", QMD_COLLECTION],
      5_000,
    );
    const currentPath = shown.stdout.match(/^\s*Path:\s+(.+)$/m)?.[1];
    if (!currentPath || resolve(currentPath) !== resolve(directory)) {
      await runner(
        executable,
        ["--index", QMD_INDEX, "collection", "remove", QMD_COLLECTION],
        10_000,
      );
      await addQmdCollection(executable, directory, runner);
    }
  } else {
    await addQmdCollection(executable, directory, runner);
  }

  await runner(executable, ["--index", QMD_INDEX, "update"], 30_000);
  await runner(
    executable,
    [
      "--index",
      QMD_INDEX,
      "embed",
      "-c",
      QMD_COLLECTION,
      "--max-docs-per-batch",
      "50",
      "--max-batch-mb",
      "10",
    ],
    120_000,
  );

  const state: QmdState = {
    schemaVersion: 1,
    libraryFingerprint: promptLibraryFingerprint([...records]),
    collectionPath: resolve(directory),
    qmdVersion: version,
    documentCount: records.length,
    vectorCount: records.length,
    updatedAt: new Date().toISOString(),
  };
  await atomicWriteJson(statePath, state);
  return {
    state: "healthy",
    executable,
    version,
    collectionPath: state.collectionPath,
    documentCount: state.documentCount,
    vectorCount: state.vectorCount,
    lastUpdated: state.updatedAt,
    message: "Meaning-based search is indexed and ready.",
  };
}

export async function searchQmd(
  query: string,
  configuredExecutable?: string,
  runner: QmdRunner = runQmd,
): Promise<QmdSearchResult[]> {
  const normalized = oneLine(query).slice(0, 500);
  if (normalized.length < 2) return [];
  const executable = await resolveQmdExecutable(configuredExecutable);
  const queryDocument = [
    `intent: Find saved coding prompts that match this requested task; avoid prompts for unrelated work.`,
    `lex: ${normalized}`,
    `vec: A reusable coding-agent prompt for this task: ${normalized}`,
  ].join("\n");
  const result = await runner(
    executable,
    [
      "--index",
      QMD_INDEX,
      "query",
      queryDocument,
      "-c",
      QMD_COLLECTION,
      "-n",
      "20",
      "--min-score",
      "0.2",
      "--format",
      "json",
      "--explain",
      "--no-rerank",
    ],
    20_000,
  );
  const raw = parseQmdResults(result.stdout);
  return raw.flatMap((item) => {
    const id = item.file.match(UUID)?.[0];
    if (!id || item.semanticScore < 0.35) return [];
    return [
      {
        id,
        score: item.semanticScore,
        semanticScore: item.semanticScore,
        matchedBy: ["meaning (QMD)"],
        file: item.file,
      },
    ];
  });
}

export function fusePromptSearch(
  exact: readonly SearchResult[],
  semantic: readonly QmdSearchResult[],
): SearchResult[] {
  const combined = new Map<string, SearchResult>();
  exact.forEach((result, index) => {
    combined.set(result.id, {
      ...result,
      score: 2_000 - index * 10 + Math.min(result.score, 100),
    });
  });
  semantic.forEach((result, index) => {
    const existing = combined.get(result.id);
    if (existing) {
      combined.set(result.id, {
        id: result.id,
        score:
          existing.score +
          100 +
          Math.max(0, Math.min(result.semanticScore, 1)) * 20,
        matchedBy: [...new Set([...existing.matchedBy, ...result.matchedBy])],
      });
      return;
    }
    combined.set(result.id, {
      id: result.id,
      score:
        1_000 -
        index * 10 +
        Math.max(0, Math.min(result.semanticScore, 1)) * 20,
      matchedBy: result.matchedBy,
    });
  });
  return [...combined.values()].sort(
    (left, right) =>
      right.score - left.score || left.id.localeCompare(right.id),
  );
}

export async function runQmd(
  executable: string,
  args: readonly string[],
  timeoutMs = 20_000,
): Promise<QmdCommandResult> {
  const path = [
    "/opt/homebrew/bin",
    "/usr/local/bin",
    join(homedir(), ".bun", "bin"),
    join(homedir(), ".npm-global", "bin"),
    process.env.PATH ?? "",
  ]
    .filter(Boolean)
    .join(":");
  const result = await execFileAsync(executable, [...args], {
    encoding: "utf8",
    env: { ...process.env, PATH: path },
    timeout: timeoutMs,
    maxBuffer: 4 * 1024 * 1024,
    windowsHide: true,
  });
  return {
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function parseQmdResults(value: string): RawQmdResult[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("QMD returned invalid JSON.");
  }
  if (!Array.isArray(parsed)) throw new Error("QMD results must be an array.");
  return parsed.map((item, index) => {
    if (
      !isObject(item) ||
      typeof item.file !== "string" ||
      typeof item.score !== "number" ||
      !Number.isFinite(item.score)
    ) {
      throw new Error(`QMD result ${index + 1} is invalid.`);
    }
    const vectorScores =
      isObject(item.explain) && Array.isArray(item.explain.vectorScores)
        ? item.explain.vectorScores.filter(
            (score): score is number =>
              typeof score === "number" && Number.isFinite(score),
          )
        : [];
    return {
      file: item.file,
      score: item.score,
      semanticScore:
        vectorScores.length > 0 ? Math.max(...vectorScores) : item.score,
    };
  });
}

async function addQmdCollection(
  executable: string,
  directory: string,
  runner: QmdRunner,
): Promise<void> {
  await runner(
    executable,
    [
      "--index",
      QMD_INDEX,
      "collection",
      "add",
      directory,
      "--name",
      QMD_COLLECTION,
      "--mask",
      "*.md",
    ],
    30_000,
  );
  try {
    await runner(
      executable,
      [
        "--index",
        QMD_INDEX,
        "context",
        "add",
        `qmd://${QMD_COLLECTION}`,
        "Saved coding-agent prompts. Return the prompt whose intended task best matches the search request.",
      ],
      10_000,
    );
  } catch {
    // Context improves ranking but is not required for semantic search.
  }
}

async function readQmdState(path: string): Promise<QmdState | undefined> {
  try {
    const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
    if (
      !isObject(parsed) ||
      parsed.schemaVersion !== 1 ||
      typeof parsed.libraryFingerprint !== "string" ||
      typeof parsed.collectionPath !== "string" ||
      typeof parsed.qmdVersion !== "string" ||
      typeof parsed.documentCount !== "number" ||
      typeof parsed.vectorCount !== "number" ||
      typeof parsed.updatedAt !== "string"
    ) {
      return undefined;
    }
    return parsed as unknown as QmdState;
  } catch (error) {
    if (isObject(error) && error.code === "ENOENT") return undefined;
    return undefined;
  }
}

async function atomicWriteJson(path: string, value: QmdState): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    await rename(temporary, path);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

function oneLine(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function numberFrom(value: string, pattern: RegExp): number {
  const match = value.match(pattern)?.[1];
  return match ? Number(match) : 0;
}

function unavailable(
  executable: string,
  version: string | undefined,
  message: string,
): QmdHealth {
  return {
    state: "unavailable",
    executable,
    ...(version ? { version } : {}),
    documentCount: 0,
    vectorCount: 0,
    message,
  };
}

function qmdError(error: unknown): string {
  if (isObject(error)) {
    const stderr = typeof error.stderr === "string" ? error.stderr.trim() : "";
    if (stderr) return stderr.split("\n").slice(-3).join(" ");
  }
  return error instanceof Error ? error.message : String(error);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
