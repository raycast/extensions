import fs from "node:fs/promises";
import { rmSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fmtInt } from "./format.js";
import { serializeParsedSession, deserializeParsedSession } from "./session.js";

async function cacheMtime(adapter) {
  return (await fs.stat(adapter.cachePath).catch(() => null))?.mtimeMs ?? null;
}

async function readCache(adapter) {
  // The modification time later shows whether another run saved the cache meanwhile.
  const mtimeMs = await cacheMtime(adapter);
  try {
    const cache = JSON.parse(await fs.readFile(adapter.cachePath, "utf8"));
    if ((!cache.agent || cache.agent === adapter.id) && cache.version === adapter.cacheVersion && cache.entries && typeof cache.entries === "object") return { ...cache, mtimeMs };
  } catch { /* A missing/corrupt cache can always be rebuilt. */ }
  return { version: adapter.cacheVersion, entries: {}, mtimeMs };
}

const ABANDONED_TEMPORARY_MS = 10 * 60_000;
const UNUSED_OLD_VERSION_MS = 30 * 24 * 60 * 60_000;

// Cache directories are shared by concurrent CLI versions (npx and the pinned Raycast copy):
// remove only abandoned temporaries and long-unused older versions, never current or newer caches.
async function removeStaleCacheFiles(adapter) {
  const dir = path.dirname(adapter.cachePath);
  for (const name of await fs.readdir(dir)) {
    const temporary = name.match(/^(.+)\.[0-9a-f-]{36}\.tmp$/);
    const version = Number(name.match(/-v(\d+)\.json$/)?.[1]);
    const maxAge = temporary
      ? adapter.cachePattern.test(temporary[1]) && ABANDONED_TEMPORARY_MS
      : adapter.cachePattern.test(name) && version < adapter.cacheVersion && UNUSED_OLD_VERSION_MS;
    if (!maxAge) continue;
    const file = path.join(dir, name);
    if (Date.now() - (await fs.stat(file)).mtimeMs > maxAge) await fs.rm(file, { force: true });
  }
}

async function writeCache(adapter, entries) {
  const temporary = `${adapter.cachePath}.${randomUUID()}.tmp`;
  // Signals skip `finally`: remove the partial file, then exit through the default handler.
  const abort = (signal) => { rmSync(temporary, { force: true }); process.kill(process.pid, signal); };
  process.once("SIGINT", abort).once("SIGTERM", abort);
  try {
    await fs.mkdir(path.dirname(adapter.cachePath), { recursive: true });
    await removeStaleCacheFiles(adapter).catch(() => {});
    await fs.writeFile(temporary, JSON.stringify({ agent: adapter.id, version: adapter.cacheVersion, entries }) + "\n");
    await fs.rename(temporary, adapter.cachePath);
  } catch { /* Reporting must work even when caching is unavailable. */ }
  finally {
    process.off("SIGINT", abort).off("SIGTERM", abort);
    await fs.rm(temporary, { force: true }).catch(() => {});
  }
}

export async function clearSessionCaches(adapters) {
  let removed = 0;
  for (const adapter of adapters) {
    const dir = path.dirname(adapter.cachePath);
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); }
    catch (error) { if (error.code === "ENOENT") continue; throw error; }
    const owned = entries.filter((entry) => entry.isFile() && adapter.cachePattern.test(entry.name));
    for (const entry of owned) await fs.unlink(path.join(dir, entry.name));
    removed += owned.length;
  }
  return removed;
}


function cacheEntryMatches(entry, stat) {
  return entry && entry.size === stat.size && entry.mtimeMs === stat.mtimeMs && Object.hasOwn(entry, "parsed");
}

function parsedCacheMatches(parsed, adapter, requireInsights) {
  if (requireInsights && parsed.insightsVersion !== adapter.insightsVersion) return false;
  return !adapter.cacheValid || adapter.cacheValid(parsed);
}

function cachedSession(entry, stat, adapter, requireInsights) {
  if (!cacheEntryMatches(entry, stat)) return undefined;
  if (entry.parsed == null) return null;
  if (!parsedCacheMatches(entry.parsed, adapter, requireInsights)) return undefined;
  try { return deserializeParsedSession(entry.parsed); }
  catch { return undefined; }
}

async function sourceRecords(files) {
  // Parallel stats overlap disk latency; thousands of sequential awaits made cold starts slow.
  const stats = await Promise.all(files.map((file) => fs.stat(file).catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  })));
  return files.flatMap((file, index) => stats[index] ? [{ file, stat: stats[index] }] : []);
}

const DAY_MS = 86_400_000;

// Transcripts are append-only: a file last modified before the period, or created after it,
// holds no event inside it. One day absorbs time zones and clock skew.
function mayCoverPeriod(adapter, record, { start, end }) {
  if (start && record.stat.mtimeMs < start.getTime() - DAY_MS) return false;
  const created = adapter.createdAt?.(record.file);
  return !(end && created && created.getTime() > end.getTime() + DAY_MS);
}

function logCache(records, skipped) {
  const misses = records.filter((r) => r.parsed === undefined).length;
  const fileLabel = records.length === 1 ? "session file" : "session files";
  const suffix = skipped ? ` (${fmtInt(skipped)} outside the period skipped)` : "";
  console.error(misses === 0
    ? `Cache hit: using ${fmtInt(records.length)} cached ${fileLabel}${suffix}.`
    : `Cache miss: recalculating ${fmtInt(misses)} of ${fmtInt(records.length)} ${fileLabel}${suffix}.`);
}

// Cache orchestration is shared; transcript semantics and reconciliation belong to adapters.

async function loadRecord(adapter, record, options, context) {
  const parsed = options.useCache && record.parsed !== undefined
    ? record.parsed
    : await adapter.parse(record.file, context, options.useCache ? null : options.start, options.useCache ? null : options.end);
  if (parsed) {
    parsed.agent = adapter.id;
    context.set(parsed.id, parsed.turnIds);
  }
  return parsed;
}

export async function readParsedSessions(adapter, files, options) {
  const context = new Map();
  const cache = options.useCache ? await readCache(adapter) : { entries: {} };
  const records = await sourceRecords(files);
  const cached = (record) => {
    if (!("parsed" in record)) record.parsed = cachedSession(cache.entries[record.file], record.stat, adapter, options.requireInsights);
    return record;
  };
  const selected = records.filter((record) => mayCoverPeriod(adapter, record, options)).map(cached);
  const skipped = records.length - selected.length;
  if (options.useCache) logCache(selected, skipped);
  else console.error(`Cache bypassed: recalculating ${fmtInt(selected.length)} session ${selected.length === 1 ? "file" : "files"}${skipped ? ` (${fmtInt(skipped)} outside the period skipped)` : ""}.`);
  const byId = new Map(records.flatMap((record) => {
    const id = adapter.fileId?.(record.file);
    return id ? [[id, record]] : [];
  }));
  const loaded = new Map();
  async function load(record) {
    if (loaded.has(record)) return;
    loaded.set(record, null);
    let parsed = await loadRecord(adapter, cached(record), options, context);
    // Skipped files still supply what a selected file references: Codex fork turn IDs or
    // original Claude records. Parsers that read that context run again once it is loaded.
    const missing = (parsed ? adapter.references?.(parsed) ?? [] : []).map((id) => byId.get(id)).filter((dependency) => dependency && !loaded.has(dependency));
    for (const dependency of missing) await load(dependency);
    if (missing.length && record.parsed === undefined && adapter.parseUsesContext) parsed = await loadRecord(adapter, record, options, context);
    loaded.set(record, parsed);
  }
  for (const record of selected) await load(record);
  const parsedSessions = records.filter((record) => loaded.get(record)).map((record) => loaded.get(record));
  if (options.useCache) {
    // Unchanged and skipped entries keep their payload, so short periods preserve the full cache.
    // Skipped entries come from the newest save in case another run finished meanwhile.
    const saved = await cacheMtime(adapter) === cache.mtimeMs ? cache : await readCache(adapter);
    const entries = {};
    for (const record of records) {
      if (!loaded.has(record)) {
        const entry = saved.entries[record.file] ?? cache.entries[record.file];
        if (entry) entries[record.file] = entry;
        continue;
      }
      const parsed = loaded.get(record);
      entries[record.file] = record.parsed !== undefined
        ? cache.entries[record.file]
        : { size: record.stat.size, mtimeMs: record.stat.mtimeMs, parsed: parsed ? serializeParsedSession(parsed) : null };
    }
    const changed = [...loaded.keys()].some((record) => record.parsed === undefined)
      || Object.keys(saved.entries).length !== Object.keys(entries).length;
    if (changed) await writeCache(adapter, entries);
  }
  return adapter.reconcile(parsedSessions, { start: options.start, end: options.end });
}
