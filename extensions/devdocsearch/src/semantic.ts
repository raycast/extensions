import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createHash, randomUUID } from "node:crypto";
import { closeSync, openSync } from "node:fs";
import { docsDirectory, listCollections, searchLibrary } from "./library";
import { embeddingConfigPath, readEmbeddingConfig, type EmbeddingConfig } from "./embedding-config";
import type { SavedPage, SearchResult } from "./docs";
import type { Collection } from "./library";

type SemanticMatch = { snapshot: string; url: string; excerpt: string; score: number };
type Pending = { resolve: (matches: SemanticMatch[]) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> };

let worker: ChildProcessWithoutNullStreams | undefined;
let workerConfig = "";
let output = "";
const pending = new Map<string, Pending>();
let idleTimer: ReturnType<typeof setTimeout> | undefined;
const IDLE_MS = 30_000;
export const LOCAL_MODEL_ID = "agentmish/pplx-embed-v1-0.6b-mlx@edc2b94227d1e4b8e185c1cf6db7d20d6759879b";
const CHUNKER_VERSION = "title-headings-300-40-v4";

function processIsRunning(pid: number): boolean {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; }
  catch (error) { return (error as NodeJS.ErrnoException).code === "EPERM"; }
}

function indexingWorkerIsRunning(baseDir: string): boolean {
  const path = join(baseDir, "semantic-worker.pid");
  return existsSync(path) && processIsRunning(Number(readFileSync(path, "utf8")));
}

function pausePath(baseDir: string): string { return join(baseDir, "semantic-worker.pause"); }

export function isSemanticIndexPaused(baseDir = docsDirectory()): boolean {
  return existsSync(pausePath(baseDir));
}

export function isSemanticIndexRunning(baseDir = docsDirectory()): boolean {
  return indexingWorkerIsRunning(baseDir);
}

export function pauseSemanticBackfill(baseDir = docsDirectory()): void {
  writeFileSync(pausePath(baseDir), "");
}

export async function resumeSemanticBackfill(assetsPath: string, baseDir = docsDirectory()): Promise<boolean> {
  if (!existsSync(pythonPath())) return false;
  for (let attempt = 0; indexingWorkerIsRunning(baseDir); attempt++) {
    if (attempt === 300) throw new Error("Indexing is still pausing. Try Resume again shortly.");
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (isSemanticIndexPaused(baseDir)) unlinkSync(pausePath(baseDir));
  const pidPath = join(baseDir, "semantic-worker.pid");
  if (existsSync(pidPath)) unlinkSync(pidPath);
  return startSemanticBackfill(assetsPath, baseDir);
}

function indexIdentity(config: EmbeddingConfig): { model: string; filename: string } {
  if (config.provider === "mlx") {
    const model = config.model || LOCAL_MODEL_ID;
    return { model, filename: model === LOCAL_MODEL_ID ? "semantic.sqlite" : `semantic-${createHash("sha256").update(model).digest("hex").slice(0, 16)}.sqlite` };
  }
  const model = `${config.provider}:${createHash("sha256")
    .update(JSON.stringify([config.provider, config.endpoint, config.model])).digest("hex")}`;
  return { model, filename: `semantic-${createHash("sha256").update(model).digest("hex").slice(0, 16)}.sqlite` };
}

export function semanticIndexStatus(collection: Collection, config: EmbeddingConfig, baseDir = docsDirectory()): string {
  if (!collection.snapshot) return "Vectors not built";
  const { model, filename } = indexIdentity(config);
  const path = join(baseDir, collection.id, "snapshots", collection.snapshot, filename);
  if (!existsSync(path)) return isSemanticIndexPaused(baseDir) ? "Vectors paused" : indexingWorkerIsRunning(baseDir) ? "Vectors queued" : "Vectors not built";
  try {
    const db = new DatabaseSync(path, { readOnly: true });
    try {
      const meta = Object.fromEntries((db.prepare("SELECT key, value FROM meta").all() as Array<{ key: string; value: string }>)
        .map(({ key, value }) => [key, value]));
      if (meta.model !== model || meta.chunker !== CHUNKER_VERSION) return "Vectors need rebuild";
      const indexed = Number((db.prepare("SELECT COUNT(*) AS count FROM indexed_pages").get() as { count: number }).count);
      if (meta.complete === "1" && indexed === collection.pageCount) return "Vectors ready";
      const running = processIsRunning(Number(meta.pid));
      const partial = Number(meta.current_passages) / Number(meta.total_passages);
      const percent = Math.round((indexed + (Number.isFinite(partial) ? partial : 0)) / Math.max(1, collection.pageCount) * 1000) / 10;
      if (isSemanticIndexPaused(baseDir)) return `Vectors paused at ${percent}% (${indexed}/${collection.pageCount} pages)`;
      return running
        ? `Vectors ${percent}% (${indexed}/${collection.pageCount} pages)${meta.current_passages && meta.total_passages ? ` · page ${Math.floor(partial * 100)}% (${meta.current_passages}/${meta.total_passages} passages)` : ""}`
        : indexingWorkerIsRunning(baseDir) ? `Vectors queued (${indexed}/${collection.pageCount} pages)` : `Vectors stopped (${indexed}/${collection.pageCount})`;
    } finally { db.close(); }
  } catch { return "Vector status unavailable"; }
}

function pythonPath(): string { return join(homedir(), ".context", "docsearch-venv", "bin", "python"); }

export function resetSemanticWorker(): void {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = undefined;
  for (const request of pending.values()) { clearTimeout(request.timer); request.reject(new Error("Embedding configuration changed.")); }
  pending.clear();
  worker?.kill();
  worker = undefined;
  workerConfig = "";
}

export function canAutoIndex(config: EmbeddingConfig): boolean {
  return config.provider === "mlx";
}

export async function startSemanticIndex(collection: Collection, assetsPath: string, baseDir = docsDirectory()): Promise<boolean> {
  if (!canAutoIndex(await readEmbeddingConfig())) return false;
  if (isSemanticIndexPaused(baseDir)) return false;
  if (!collection.snapshot || !existsSync(pythonPath())) return false;
  return startSemanticBackfill(assetsPath, baseDir);
}

export function startSemanticBackfill(assetsPath: string, baseDir = docsDirectory()): boolean {
  if (!existsSync(pythonPath())) return false;
  if (isSemanticIndexPaused(baseDir)) return false;
  if (indexingWorkerIsRunning(baseDir)) return true;
  const log = openSync(join(baseDir, "semantic-backfill.log"), "a");
  try {
    const child = spawn(pythonPath(), [join(assetsPath, "semantic.py"), "backfill", baseDir, "--config", embeddingConfigPath()],
      { detached: true, stdio: ["ignore", log, log] });
    child.on("error", (error) => console.error("Could not start semantic backfill:", error));
    child.unref();
    return true;
  } finally { closeSync(log); }
}

function getWorker(assetsPath: string, configIdentity: string): ChildProcessWithoutNullStreams {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = undefined;
  if (worker && !worker.killed && workerConfig === configIdentity) return worker;
  resetSemanticWorker();
  workerConfig = configIdentity;
  worker = spawn(pythonPath(), [join(assetsPath, "semantic.py"), "serve", "--config", embeddingConfigPath()], { stdio: ["pipe", "pipe", "pipe"] });
  output = "";
  worker.stderr.setEncoding("utf8");
  worker.stderr.on("data", (message: string) => console.error("Semantic worker:", message));
  worker.stdout.setEncoding("utf8");
  worker.stdout.on("data", (chunk: string) => {
    output += chunk;
    let newline = output.indexOf("\n");
    while (newline >= 0) {
      const line = output.slice(0, newline);
      output = output.slice(newline + 1);
      try {
        const message = JSON.parse(line) as { id?: string; matches?: SemanticMatch[]; error?: string };
        if (message.id && pending.has(message.id)) {
          const request = pending.get(message.id)!;
          clearTimeout(request.timer);
          pending.delete(message.id);
          if (message.error) request.reject(new Error(message.error));
          else if (Array.isArray(message.matches)) request.resolve(message.matches);
          else request.reject(new Error("Semantic worker sent an invalid response."));
          if (pending.size === 0) {
            idleTimer = setTimeout(resetSemanticWorker, IDLE_MS);
            idleTimer.unref();
          }
        }
      } catch { /* Ignore malformed lines; the request timeout will report a failure. */ }
      newline = output.indexOf("\n");
    }
  });
  const activeWorker = worker;
  const fail = (error: Error) => {
    if (worker !== activeWorker) return;
    for (const request of pending.values()) { clearTimeout(request.timer); request.reject(error); }
    pending.clear();
    worker = undefined;
  };
  worker.on("error", fail);
  worker.on("close", (code, signal) => fail(new Error(`Local semantic worker stopped (${code ?? signal ?? "unknown"}).`)));
  return worker;
}

async function searchSemantic(query: string, snapshots: string[], assetsPath: string): Promise<SemanticMatch[]> {
  if (!existsSync(pythonPath())) return [];
  const config = await readEmbeddingConfig();
  const configIdentity = JSON.stringify(config);
  const { model: providerIdentity, filename } = indexIdentity(config);
  const ready = snapshots.some((snapshot) => {
    const path = join(snapshot, filename);
    if (!existsSync(path)) return false;
    const db = new DatabaseSync(path, { readOnly: true });
    try {
      const rows = db.prepare("SELECT key, value FROM meta WHERE key IN ('model', 'complete', 'chunker')").all() as Array<{ key: string; value: string }>;
      const meta = Object.fromEntries(rows.map(({ key, value }) => [key, value]));
      return meta.model === providerIdentity && meta.complete === "1" && meta.chunker === CHUNKER_VERSION;
    } finally { db.close(); }
  });
  if (!ready) return [];
  const child = getWorker(assetsPath, configIdentity);
  const id = randomUUID();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error("Local semantic search timed out."));
      if (pending.size === 0) resetSemanticWorker();
    }, 15000);
    pending.set(id, { resolve, reject, timer });
    child.stdin.write(`${JSON.stringify({ id, query, snapshots })}\n`);
  });
}

function pageFromMatch(match: SemanticMatch, permitted: Set<string>): SavedPage | undefined {
  if (!permitted.has(match.snapshot)) return undefined;
  const db = new DatabaseSync(join(match.snapshot, "index.sqlite"), { readOnly: true });
  try {
    const row = db.prepare("SELECT url, title, markdown, fetchedAt FROM pages WHERE url = ?").get(match.url);
    if (!row) return undefined;
    return row as unknown as SavedPage;
  } finally { db.close(); }
}

export async function searchHybridLibrary(query: string, assetsPath: string, supportPath?: string, baseDir = docsDirectory()): Promise<SearchResult[]> {
  const keyword = await searchLibrary(query, baseDir, supportPath);
  if (!query.trim()) return keyword;
  const collections = await listCollections(baseDir, supportPath);
  const snapshots = collections.filter((item) => item.snapshot)
    .map((item) => join(baseDir, item.id, "snapshots", item.snapshot!));
  if (!snapshots.length) return keyword;
  let semantic: SemanticMatch[];
  try { semantic = await searchSemantic(query, snapshots, assetsPath); }
  catch (error) {
    console.error("Local semantic search unavailable:", error);
    return keyword;
  }
  const permitted = new Set(snapshots);
  const fused = new Map<string, { result: SearchResult; rank: number }>();
  const terms = [...new Set(query.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])]
    .filter((term) => !["a", "an", "and", "do", "does", "for", "how", "i", "in", "is", "of", "the", "this", "to", "with"].includes(term));
  const hasFullKeywordMatch = keyword.some(({ page, excerpt }) => terms.every((term) => `${page.title} ${excerpt}`.toLocaleLowerCase().includes(term)));
  const keywordWeight = semantic.length && !hasFullKeywordMatch ? 0.01 : 1.2;
  keyword.forEach((result, index) => fused.set(result.page.url, { result, rank: keywordWeight / (60 + index + 1) }));
  semantic.forEach((match, index) => {
    const prior = fused.get(match.url);
    const page = prior?.result.page ?? pageFromMatch(match, permitted);
    if (!page) return;
    const rank = (prior?.rank ?? 0) + 1.2 / (60 + index + 1);
    fused.set(match.url, { result: { page, excerpt: match.excerpt, score: rank }, rank });
  });
  return [...fused.values()].sort((a, b) => b.rank - a.rank || a.result.page.title.localeCompare(b.result.page.title))
    .slice(0, 100).map(({ result }) => result);
}
