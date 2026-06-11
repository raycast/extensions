import { join } from "node:path";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import https from "node:https";
import type { DateRange, UsageEvent, UsageReaderSink } from "../types";
import { estimateCost } from "../pricing";
import { expandHome, isInRange, safeNumber } from "./shared";

const execFileAsync = promisify(execFile);

/** Dashboard API totals — reused when View Details needs attribution. */
const CURSOR_API_CACHE_TTL_MS = 5 * 60_000;
/** Per-chat SQLite breakdown — Cursor writes to the DB constantly; ignore mtime. */
const CURSOR_CONVERSATIONS_CACHE_TTL_MS = 15 * 60_000;

type CursorEventsCache = {
  at: number;
  rangeKey: string;
  events: UsageEvent[];
  errors: string[];
};

type CursorConversationsCache = {
  at: number;
  rangeKey: string;
  events: UsageEvent[];
  errors: string[];
};

let eventsCache: CursorEventsCache | null = null;
let conversationsCache: CursorConversationsCache | null = null;

export function clearCursorApiCache(): void {
  eventsCache = null;
  conversationsCache = null;
}

/** Load windows share a stable start; end is always `new Date()` and drifts every call. */
function rangeKey(range: DateRange): string {
  return String(range.start.getTime());
}

function cacheWithinTtl(at: number, ttlMs: number): boolean {
  return Date.now() - at < ttlMs;
}

function cachedApiEventsForRange(range: DateRange): UsageEvent[] {
  if (
    !eventsCache ||
    eventsCache.rangeKey !== rangeKey(range) ||
    !cacheWithinTtl(eventsCache.at, CURSOR_API_CACHE_TTL_MS)
  ) {
    return [];
  }
  return eventsCache.events;
}

function sqlInList(ids: string[]): string {
  return ids.map((id) => `'${id.replace(/'/g, "''")}'`).join(", ");
}

/**
 * Cursor bubbles often omit a real API id (`default`, empty, `auto`). LiteLLM has
 * no SKU for that; map to bundled `cursor-auto` surrogate rates for non-zero estimates.
 */
function modelForCostEstimate(modelName: string | null | undefined): string {
  const t = (modelName ?? "").trim();
  if (!t) return "cursor-auto";
  if (/^default$/i.test(t)) return "cursor-auto";
  if (/^auto$/i.test(t)) return "cursor-auto";
  if (/^cursor-auto$/i.test(t)) return "cursor-auto";
  return t;
}

/* ------------------------------------------------------------------ */
/*  Cursor dashboard API types                                        */
/* ------------------------------------------------------------------ */

type FilteredUsageEvent = {
  timestamp: string;
  model: string;
  kind?: string;
  tokenUsage?: {
    inputTokens?: number;
    outputTokens?: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
    totalCents?: number;
  };
};

type FilteredUsageEventsResponse = {
  totalUsageEventsCount: number;
  usageEventsDisplay: FilteredUsageEvent[];
};

function cursorDbPath(basePath: string) {
  return join(
    expandHome(basePath || "~/Library/Application Support/Cursor"),
    "User",
    "globalStorage",
    "state.vscdb",
  );
}

async function readAccessToken(dbPath: string): Promise<string | null> {
  if (!existsSync(dbPath)) return null;
  try {
    const uri = `file:${dbPath.replace(/ /g, "%20")}?mode=ro&immutable=1`;
    const { stdout } = await execFileAsync(
      "sqlite3",
      [uri, "SELECT value FROM ItemTable WHERE key = 'cursorAuth/accessToken'"],
      { encoding: "utf8", timeout: 5000 },
    );
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

function extractUserId(token: string): string | null {
  try {
    const decoded = decodeURIComponent(token);
    if (decoded.includes("::")) return decoded.split("::")[0];
    const parts = decoded.split(".");
    if (parts.length === 3) {
      let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      while (base64.length % 4) base64 += "=";
      const payload = JSON.parse(Buffer.from(base64, "base64").toString());
      if (payload.sub) {
        const match = payload.sub.match(/user_[A-Za-z0-9]+/);
        if (match) return match[0];
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function buildCookie(token: string, userId: string): string {
  let v = token;
  if (!v.includes("::") && !v.includes("%3A%3A")) {
    v = `${userId}%3A%3A${v}`;
  } else if (v.includes("::") && !v.includes("%3A%3A")) {
    v = v.replace("::", "%3A%3A");
  }
  return v;
}

/** Ensure exactly one `Cursor API:` prefix (handles legacy double-wrapped messages). */
function cursorApiErrorMessage(err: unknown): string {
  const raw =
    typeof err === "string"
      ? err
      : err instanceof Error
        ? err.message
        : "failed";
  const stripped = raw.replace(/^(Cursor API:\s*)+/i, "").trim() || "failed";
  return `Cursor API: ${stripped}`;
}

function postJson<T>(path: string, cookie: string, body: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body ?? {});
    const req = https.request(
      {
        hostname: "cursor.com",
        port: 443,
        path,
        method: "POST",
        headers: {
          Cookie: `WorkosCursorSessionToken=${cookie}`,
          Accept: "application/json",
          "Content-Type": "application/json",
          Origin: "https://cursor.com",
          Referer: "https://cursor.com/dashboard",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let buf = "";
        res.on("data", (chunk) => (buf += chunk));
        res.on("end", () => {
          if (res.statusCode === 200) {
            try {
              resolve(JSON.parse(buf));
            } catch {
              reject(new Error("invalid JSON"));
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      },
    );
    req.on("error", (err) => reject(err));
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error("timeout"));
    });
    req.write(data);
    req.end();
  });
}

const CURSOR_TITLE_MAX = 80;
const PAGE_SIZE = 200;
const MAX_PAGES = 50;

function truncateCursorTitle(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length <= CURSOR_TITLE_MAX
    ? t
    : `${t.slice(0, CURSOR_TITLE_MAX - 1)}…`;
}

async function streamCursorApiEvents(
  dbPath: string,
  range: DateRange,
  sink: UsageReaderSink,
): Promise<{ errors: string[]; hadEvents: boolean }> {
  const { events, errors } = await fetchCursorApiEvents(dbPath, range);
  let hadEvents = false;

  for (const evt of events) {
    if (!isInRange(evt.timestamp, range.start, range.end)) continue;
    if (sink.event) {
      sink.metric?.({
        timestamp: evt.timestamp,
        totalTokens: evt.totalTokens,
        estimatedCost: evt.estimatedCost,
        estimatedTokens: evt.estimatedTokens,
      });
      sink.event(evt);
      hadEvents = true;
      continue;
    }
    sink.metric?.({
      timestamp: evt.timestamp,
      totalTokens: evt.totalTokens,
      estimatedCost: evt.estimatedCost,
      estimatedTokens: evt.estimatedTokens,
    });
    hadEvents = true;
  }

  return { errors, hadEvents };
}

async function fetchUsageEventsInRange(
  cookie: string,
  range: DateRange,
): Promise<{ events: FilteredUsageEvent[]; truncated: boolean }> {
  const events: FilteredUsageEvent[] = [];
  let truncated = false;

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const resp = await postJson<FilteredUsageEventsResponse>(
      "/api/dashboard/get-filtered-usage-events",
      cookie,
      {
        startDate: String(range.start.getTime()),
        endDate: String(range.end.getTime()),
        page,
        pageSize: PAGE_SIZE,
      },
    );

    const rows = resp.usageEventsDisplay ?? [];
    if (rows.length === 0) break;
    events.push(...rows);
    if (rows.length < PAGE_SIZE) break;

    const oldest = Number(rows[rows.length - 1].timestamp);
    if (Number.isFinite(oldest) && oldest < range.start.getTime()) break;
    if (page === MAX_PAGES) truncated = true;
  }

  return { events, truncated };
}

function eventFromFiltered(
  raw: FilteredUsageEvent,
  index: number,
): UsageEvent | null {
  const tsMs = Number(raw.timestamp);
  if (!Number.isFinite(tsMs)) return null;
  if (raw.kind && /_NOT_CHARGED$/.test(raw.kind)) return null;

  const inputTokens = safeNumber(raw.tokenUsage?.inputTokens);
  const outputTokens = safeNumber(raw.tokenUsage?.outputTokens);
  const cacheReadTokens = safeNumber(raw.tokenUsage?.cacheReadTokens);
  const cacheWriteTokens = safeNumber(raw.tokenUsage?.cacheWriteTokens);
  const totalTokens =
    inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens;

  const totalCents = raw.tokenUsage?.totalCents;
  const estimatedCost =
    typeof totalCents === "number" && Number.isFinite(totalCents)
      ? totalCents / 100
      : estimateCost({
          model: modelForCostEstimate(raw.model),
          inputTokens,
          outputTokens,
          cacheReadTokens,
          cacheWriteTokens,
        });

  return {
    id: `cursor:event:${raw.timestamp}:${raw.model || "auto"}:${index}`,
    provider: "cursor",
    timestamp: new Date(tsMs),
    model: raw.model || "cursor-auto",
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    totalTokens,
    estimatedCost,
    estimatedTokens: false,
    sourcePath: "cursor-api",
  };
}

/* ------------------------------------------------------------------ */
/*  Local SQLite — per-conversation aggregates (View Details)          */
/* ------------------------------------------------------------------ */

type ComposerRow = {
  composerId: string;
  lastUpdatedAt: number | null;
  createdAt: number | null;
  title: string | null;
};

type BubbleRow = {
  composerId: string;
  inputTokens: number | null;
  outputTokens: number | null;
  cacheReadTokens: number | null;
  cacheWriteTokens: number | null;
  modelName: string | null;
  model: string | null;
};

type ComposerAgg = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  messageCount: number;
  modelCounts: Map<string, number>;
};

type ComposerWindowRow = {
  composerId: string;
  firstBubble: string | number | null;
  lastBubble: string | number | null;
  bubbleCount: number | null;
};

type ComposerSession = {
  composerId: string;
  title: string;
  lastMs: number;
  windowStart: number;
  windowEnd: number;
};

type ApiComposerAgg = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalTokens: number;
  estimatedCost: number;
  messageCount: number;
  modelCounts: Map<string, number>;
};

function emptyAgg(): ComposerAgg {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    messageCount: 0,
    modelCounts: new Map(),
  };
}

function emptyApiAgg(): ApiComposerAgg {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    totalTokens: 0,
    estimatedCost: 0,
    messageCount: 0,
    modelCounts: new Map(),
  };
}

function parseBubbleTime(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const ms = Date.parse(value);
    if (Number.isFinite(ms)) return ms;
  }
  return null;
}

function pickComposerForApiEvent(
  eventMs: number,
  sessions: ComposerSession[],
): ComposerSession | null {
  const candidates = sessions.filter(
    (session) => eventMs >= session.windowStart && eventMs <= session.windowEnd,
  );
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  return candidates.sort((a, b) => {
    const spanA = a.windowEnd - a.windowStart;
    const spanB = b.windowEnd - b.windowStart;
    if (spanA !== spanB) return spanA - spanB;
    return (
      Math.abs(a.lastMs - eventMs) - Math.abs(b.lastMs - eventMs) ||
      b.lastMs - a.lastMs
    );
  })[0];
}

function attributeApiEventsToComposers(
  apiEvents: UsageEvent[],
  sessions: ComposerSession[],
): Map<string, ApiComposerAgg> {
  const byComposer = new Map<string, ApiComposerAgg>();
  for (const event of apiEvents) {
    const session = pickComposerForApiEvent(
      event.timestamp.getTime(),
      sessions,
    );
    if (!session) continue;

    let agg = byComposer.get(session.composerId);
    if (!agg) {
      agg = emptyApiAgg();
      byComposer.set(session.composerId, agg);
    }
    agg.inputTokens += event.inputTokens;
    agg.outputTokens += event.outputTokens;
    agg.cacheReadTokens += event.cacheReadTokens;
    agg.cacheWriteTokens += event.cacheWriteTokens;
    agg.totalTokens += event.totalTokens;
    agg.estimatedCost += event.estimatedCost;
    agg.messageCount += 1;
    if (event.model) {
      agg.modelCounts.set(
        event.model,
        (agg.modelCounts.get(event.model) ?? 0) + 1,
      );
    }
  }
  return byComposer;
}

function pickTopModel(modelCounts: Map<string, number>): string {
  let top = "cursor-auto";
  let count = 0;
  for (const [model, n] of modelCounts) {
    if (n > count) {
      top = model;
      count = n;
    }
  }
  return top;
}

/**
 * Builds one UsageEvent per composer for View Details.
 * Uses local bubble token sums when present; otherwise attributes API events to
 * composers by matching event timestamps to each chat's bubble activity window.
 */
async function readCursorConversations(
  dbPath: string,
  apiEvents: UsageEvent[] = [],
  activeSinceMs?: number,
): Promise<{ events: UsageEvent[]; errors: string[] }> {
  const errors: string[] = [];
  if (!existsSync(dbPath)) {
    return { events: [], errors: ["Cursor: no DB"] };
  }

  const uri = `file:${dbPath.replace(/ /g, "%20")}?mode=ro&immutable=1`;
  const sinceFilter =
    typeof activeSinceMs === "number" && Number.isFinite(activeSinceMs)
      ? `and coalesce(
          json_extract(cast(value as text), '$.lastUpdatedAt'),
          json_extract(cast(value as text), '$.createdAt')
        ) >= ${Math.floor(activeSinceMs)}`
      : "";

  let composerRows: ComposerRow[] = [];
  try {
    const composerSql = `
      select
        substr(key, instr(key, ':') + 1)                                   as composerId,
        json_extract(cast(value as text), '$.lastUpdatedAt')               as lastUpdatedAt,
        json_extract(cast(value as text), '$.createdAt')                   as createdAt,
        coalesce(
          nullif(json_extract(cast(value as text), '$.text'), ''),
          nullif(json_extract(cast(value as text), '$.name'), ''),
          nullif(json_extract(cast(value as text), '$.title'), '')
        )                                                                  as title
      from cursorDiskKV
      where key like 'composerData:%'
      ${sinceFilter}
    `;
    const { stdout } = await execFileAsync(
      "sqlite3",
      ["-json", uri, composerSql],
      { encoding: "utf8", maxBuffer: 1024 * 1024 * 20, timeout: 15000 },
    );
    if (stdout.trim())
      composerRows = JSON.parse(stdout.trim()) as ComposerRow[];
  } catch {
    return { events: [], errors: ["Cursor: composer read error"] };
  }

  const composers = new Map<
    string,
    { lastMs: number; firstMs: number; title: string }
  >();
  for (const row of composerRows) {
    const lastMs = Number(row.lastUpdatedAt ?? row.createdAt ?? NaN);
    const firstMs = Number(row.createdAt ?? row.lastUpdatedAt ?? NaN);
    if (!Number.isFinite(lastMs) || lastMs <= 0) continue;
    const title =
      typeof row.title === "string" && row.title.trim()
        ? truncateCursorTitle(row.title)
        : "Cursor conversation";
    composers.set(row.composerId, {
      lastMs,
      firstMs: Number.isFinite(firstMs) && firstMs > 0 ? firstMs : lastMs,
      title,
    });
  }

  const activeComposerIds = [...composers.keys()];
  if (activeComposerIds.length === 0) {
    return { events: [], errors };
  }

  const composerInClause = sqlInList(activeComposerIds);

  const windows = new Map<
    string,
    { firstBubble: unknown; lastBubble: unknown; bubbleCount: number }
  >();
  try {
    const windowSql = `
      select
        substr(key, length('bubbleId:') + 1, 36)                            as composerId,
        min(json_extract(cast(value as text), '$.createdAt'))               as firstBubble,
        max(json_extract(cast(value as text), '$.createdAt'))               as lastBubble,
        count(*)                                                            as bubbleCount
      from cursorDiskKV
      where key like 'bubbleId:%'
        and substr(key, length('bubbleId:') + 1, 36) in (${composerInClause})
      group by composerId
    `;
    const { stdout } = await execFileAsync(
      "sqlite3",
      ["-json", uri, windowSql],
      { encoding: "utf8", maxBuffer: 1024 * 1024 * 20, timeout: 20000 },
    );
    if (stdout.trim()) {
      for (const row of JSON.parse(stdout.trim()) as ComposerWindowRow[]) {
        windows.set(row.composerId, {
          firstBubble: row.firstBubble,
          lastBubble: row.lastBubble,
          bubbleCount: safeNumber(row.bubbleCount),
        });
      }
    }
  } catch {
    return { events: [], errors: ["Cursor: bubble window read error"] };
  }

  const sessions: ComposerSession[] = [];
  for (const [composerId, composer] of composers) {
    const window = windows.get(composerId);
    const windowStart =
      parseBubbleTime(window?.firstBubble) ?? composer.firstMs;
    const windowEnd = Math.max(
      parseBubbleTime(window?.lastBubble) ?? composer.lastMs,
      composer.lastMs,
    );
    if (!Number.isFinite(windowStart) || !Number.isFinite(windowEnd)) continue;
    sessions.push({
      composerId,
      title: composer.title,
      lastMs: composer.lastMs,
      windowStart,
      windowEnd,
    });
  }

  let bubbleRows: BubbleRow[] = [];
  try {
    const bubbleSql = `
      select
        substr(key, length('bubbleId:') + 1, 36)                            as composerId,
        json_extract(cast(value as text), '$.tokenCount.inputTokens')       as inputTokens,
        json_extract(cast(value as text), '$.tokenCount.outputTokens')      as outputTokens,
        json_extract(cast(value as text), '$.tokenCount.cacheReadTokens')   as cacheReadTokens,
        json_extract(cast(value as text), '$.tokenCount.cacheWriteTokens')  as cacheWriteTokens,
        json_extract(cast(value as text), '$.modelInfo.modelName')          as modelName,
        json_extract(cast(value as text), '$.model')                        as model
      from cursorDiskKV
      where key like 'bubbleId:%'
        and substr(key, length('bubbleId:') + 1, 36) in (${composerInClause})
    `;
    const { stdout } = await execFileAsync(
      "sqlite3",
      ["-json", uri, bubbleSql],
      { encoding: "utf8", maxBuffer: 1024 * 1024 * 50, timeout: 30000 },
    );
    if (stdout.trim()) bubbleRows = JSON.parse(stdout.trim()) as BubbleRow[];
  } catch {
    return { events: [], errors: ["Cursor: bubble read error"] };
  }

  const localAggByComposer = new Map<string, ComposerAgg>();
  for (const row of bubbleRows) {
    const inputTokens = safeNumber(row.inputTokens);
    const outputTokens = safeNumber(row.outputTokens);
    const cacheReadTokens = safeNumber(row.cacheReadTokens);
    const cacheWriteTokens = safeNumber(row.cacheWriteTokens);
    const totalTokens =
      inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens;
    if (totalTokens <= 0) continue;

    let agg = localAggByComposer.get(row.composerId);
    if (!agg) {
      agg = emptyAgg();
      localAggByComposer.set(row.composerId, agg);
    }
    agg.inputTokens += inputTokens;
    agg.outputTokens += outputTokens;
    agg.cacheReadTokens += cacheReadTokens;
    agg.cacheWriteTokens += cacheWriteTokens;
    agg.messageCount += 1;

    const model = (row.modelName || row.model || "").trim();
    if (model)
      agg.modelCounts.set(model, (agg.modelCounts.get(model) ?? 0) + 1);
  }

  const apiAggByComposer =
    apiEvents.length > 0
      ? attributeApiEventsToComposers(apiEvents, sessions)
      : new Map<string, ApiComposerAgg>();

  const composerIds = new Set<string>([
    ...localAggByComposer.keys(),
    ...apiAggByComposer.keys(),
  ]);

  const events: UsageEvent[] = [];
  for (const composerId of composerIds) {
    const composer = composers.get(composerId);
    if (!composer) continue;

    const localAgg = localAggByComposer.get(composerId);
    const localTotal = localAgg
      ? localAgg.inputTokens +
        localAgg.outputTokens +
        localAgg.cacheReadTokens +
        localAgg.cacheWriteTokens
      : 0;
    const apiAgg = apiAggByComposer.get(composerId);

    if (localTotal > 0 && localAgg) {
      const topModel = pickTopModel(localAgg.modelCounts);
      events.push({
        id: `cursor:convo:${composerId}`,
        provider: "cursor",
        timestamp: new Date(composer.lastMs),
        model: topModel,
        inputTokens: localAgg.inputTokens,
        outputTokens: localAgg.outputTokens,
        cacheReadTokens: localAgg.cacheReadTokens,
        cacheWriteTokens: localAgg.cacheWriteTokens,
        totalTokens: localTotal,
        estimatedCost: estimateCost({
          model: modelForCostEstimate(topModel),
          inputTokens: localAgg.inputTokens,
          outputTokens: localAgg.outputTokens,
          cacheReadTokens: localAgg.cacheReadTokens,
          cacheWriteTokens: localAgg.cacheWriteTokens,
        }),
        estimatedTokens: false,
        sourcePath: composerId,
        conversationKey: composerId,
        conversationTitle: composer.title,
      });
      continue;
    }

    if (!apiAgg || apiAgg.totalTokens <= 0) continue;

    const topModel = pickTopModel(apiAgg.modelCounts);
    events.push({
      id: `cursor:convo:${composerId}`,
      provider: "cursor",
      timestamp: new Date(composer.lastMs),
      model: topModel,
      inputTokens: apiAgg.inputTokens,
      outputTokens: apiAgg.outputTokens,
      cacheReadTokens: apiAgg.cacheReadTokens,
      cacheWriteTokens: apiAgg.cacheWriteTokens,
      totalTokens: apiAgg.totalTokens,
      estimatedCost: apiAgg.estimatedCost,
      estimatedTokens: false,
      sourcePath: composerId,
      conversationKey: composerId,
      conversationTitle: composer.title,
    });
  }

  return { events, errors };
}

/* ------------------------------------------------------------------ */
/*  Local SQLite fallback for usage totals when API is unavailable     */
/* ------------------------------------------------------------------ */

async function readLocalUsageFallback(
  dbPath: string,
  range: DateRange,
): Promise<{ events: UsageEvent[]; errors: string[] }> {
  const { events: allConversations, errors } = await readCursorConversations(
    dbPath,
    [],
    range.start.getTime(),
  );
  const filtered = allConversations.filter((e) =>
    isInRange(e.timestamp, range.start, range.end),
  );
  if (filtered.length > 0) {
    errors.push("Cursor: local DB (API unavailable)");
  }
  return { events: filtered, errors };
}

async function fetchCursorApiEvents(
  dbPath: string,
  range: DateRange,
): Promise<{ events: UsageEvent[]; errors: string[] }> {
  const errors: string[] = [];
  const key = rangeKey(range);

  if (
    eventsCache &&
    eventsCache.rangeKey === key &&
    cacheWithinTtl(eventsCache.at, CURSOR_API_CACHE_TTL_MS)
  ) {
    return {
      events: eventsCache.events,
      errors: eventsCache.errors.map(cursorApiErrorMessage),
    };
  }

  const token = await readAccessToken(dbPath);
  if (!token) {
    if (existsSync(dbPath)) errors.push("Cursor: not signed in");
    return { events: [], errors };
  }

  const userId = extractUserId(token);
  if (!userId) {
    errors.push("Cursor: no user id");
    return { events: [], errors };
  }

  try {
    const cookie = buildCookie(token, userId);
    const { events: rawEvents, truncated } = await fetchUsageEventsInRange(
      cookie,
      range,
    );
    const events: UsageEvent[] = [];
    for (let i = 0; i < rawEvents.length; i += 1) {
      const evt = eventFromFiltered(rawEvents[i], i);
      if (!evt) continue;
      if (!isInRange(evt.timestamp, range.start, range.end)) continue;
      events.push(evt);
    }
    if (truncated) {
      errors.push("Cursor: results truncated, increase MAX_PAGES");
    }
    eventsCache = {
      at: Date.now(),
      rangeKey: key,
      events,
      errors: [...errors],
    };
    return { events, errors };
  } catch (err) {
    errors.push(cursorApiErrorMessage(err));
    if (
      eventsCache &&
      eventsCache.rangeKey === key &&
      eventsCache.events.length > 0
    ) {
      return { events: eventsCache.events, errors };
    }
    return { events: [], errors };
  }
}

/** Loads per-chat rows for View Details (SQLite + API attribution). */
export async function readCursorConversationBreakdown(
  basePath: string,
  loadRange: DateRange,
): Promise<{ events: UsageEvent[]; errors: string[] }> {
  const dbPath = cursorDbPath(basePath);
  const key = rangeKey(loadRange);

  if (
    conversationsCache &&
    conversationsCache.rangeKey === key &&
    cacheWithinTtl(conversationsCache.at, CURSOR_CONVERSATIONS_CACHE_TTL_MS)
  ) {
    return {
      events: conversationsCache.events,
      errors: conversationsCache.errors,
    };
  }

  let apiEvents = cachedApiEventsForRange(loadRange);
  let result = await readCursorConversations(
    dbPath,
    apiEvents,
    loadRange.start.getTime(),
  );

  // Many Cursor chats store bubbles without per-message tokenCount; attribution
  // comes from the dashboard API. Reuse a warm cache when possible, otherwise
  // fetch once so View Details still works when opened before the dashboard.
  if (result.events.length === 0) {
    const fetchErrors: string[] = [];
    if (apiEvents.length === 0) {
      const fetched = await fetchCursorApiEvents(dbPath, loadRange);
      apiEvents = fetched.events;
      fetchErrors.push(...fetched.errors);
    }
    if (apiEvents.length > 0) {
      result = await readCursorConversations(
        dbPath,
        apiEvents,
        loadRange.start.getTime(),
      );
    }
    if (fetchErrors.length > 0) {
      result = { ...result, errors: [...result.errors, ...fetchErrors] };
    }
  }

  if (result.events.length > 0) {
    conversationsCache = {
      at: Date.now(),
      rangeKey: key,
      events: result.events,
      errors: result.errors,
    };
  }
  return result;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

export async function readCursorUsage(
  basePath: string,
  range: DateRange,
  sink: UsageReaderSink,
): Promise<string[]> {
  const errors: string[] = [];
  const dbPath = cursorDbPath(basePath);

  const streamed = await streamCursorApiEvents(dbPath, range, sink);
  errors.push(...streamed.errors);

  if (streamed.hadEvents || streamed.errors.length === 0) {
    return errors;
  }

  const local = await readLocalUsageFallback(dbPath, range);
  for (const event of local.events) {
    if (!isInRange(event.timestamp, range.start, range.end)) continue;
    if (sink.event) {
      sink.metric?.({
        timestamp: event.timestamp,
        totalTokens: event.totalTokens,
        estimatedCost: event.estimatedCost,
        estimatedTokens: event.estimatedTokens,
      });
      sink.event(event);
    } else {
      sink.metric?.({
        timestamp: event.timestamp,
        totalTokens: event.totalTokens,
        estimatedCost: event.estimatedCost,
        estimatedTokens: event.estimatedTokens,
      });
    }
  }
  errors.push(...local.errors);
  return errors;
}
