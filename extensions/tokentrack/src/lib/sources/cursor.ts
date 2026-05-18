import { join } from "node:path";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import https from "node:https";
import type { DateRange, UsageEvent } from "../types";
import { estimateCost } from "../pricing";
import { expandHome, isInRange, safeNumber } from "./shared";

const execFileAsync = promisify(execFile);

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

/**
 * Shape returned by `POST /api/dashboard/get-filtered-usage-events`.
 * This is the same endpoint cursor.com/dashboard uses to render its own
 * usage chart — it returns one row per chargeable request with real
 * timestamps + Cursor's own computed `totalCents` cost. Unlike the
 * `/api/usage` aggregate (which buckets to start-of-month only), this lets
 * us bin into Session / Today / Week / Month windows and avoids re-pricing
 * tokens ourselves with stale rate cards.
 */
type FilteredUsageEvent = {
  /** Unix ms epoch, encoded as a string. */
  timestamp: string;
  /** Cursor's internal model id, e.g. `claude-opus-4-7-thinking-xhigh`. */
  model: string;
  /**
   * Event categorisation. `USAGE_EVENT_KIND_ABORTED_NOT_CHARGED` rows have
   * tokenUsage but the user wasn't billed (aborted mid-stream). We skip those
   * so the dashboard reflects billable usage only.
   */
  kind?: string;
  requestsCosts?: number;
  isTokenBasedCall?: boolean;
  isChargeable?: boolean;
  isHeadless?: boolean;
  /** Per-event flat fee in cents (business plan), already in `chargedCents`. */
  cursorTokenFee?: number;
  /** Cents actually charged to the user/team for this event. */
  chargedCents?: number;
  tokenUsage?: {
    inputTokens?: number;
    outputTokens?: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
    /**
     * Cursor's own re-priced cost for this event, in cents. Matches what the
     * cursor.com dashboard sums under "Spend".
     */
    totalCents?: number;
  };
};

type FilteredUsageEventsResponse = {
  totalUsageEventsCount: number;
  usageEventsDisplay: FilteredUsageEvent[];
};

/* ------------------------------------------------------------------ */
/*  Auth (read access token from Cursor's SQLite store)                */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  HTTP helpers                                                       */
/* ------------------------------------------------------------------ */

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
              reject(new Error("Cursor API: invalid JSON"));
            }
          } else {
            reject(new Error(`Cursor API: HTTP ${res.statusCode}`));
          }
        });
      },
    );
    req.on("error", (err) => reject(new Error(`Cursor API: ${err.message}`)));
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error("Cursor API: timeout"));
    });
    req.write(data);
    req.end();
  });
}

/* ------------------------------------------------------------------ */
/*  Dashboard API path — granular per-event usage                      */
/* ------------------------------------------------------------------ */

/**
 * Page size for `/api/dashboard/get-filtered-usage-events`. The endpoint
 * happily returns 200+ rows per call; we keep it modest so a single
 * dashboard render only pulls what it needs. Pagination stops early once
 * we cross `range.start` (events are returned newest-first).
 */
const CURSOR_TITLE_MAX = 80;

function truncateCursorTitle(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length <= CURSOR_TITLE_MAX
    ? t
    : `${t.slice(0, CURSOR_TITLE_MAX - 1)}…`;
}

const PAGE_SIZE = 200;
/** Hard cap to avoid runaway loops if the API ever stops ordering by ts desc. */
const MAX_PAGES = 50;

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

    // Server-side date filter usually returns < PAGE_SIZE on the final page;
    // a full page means there is likely another page to fetch.
    if (rows.length < PAGE_SIZE) break;

    // Defensive early-stop: if oldest row in this page is older than the
    // window's start, we're done regardless of the server filter.
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

  // Drop rows the user wasn't billed for — they pollute the spend chart
  // and don't appear in cursor.com's own dashboard totals. Anything ending
  // in `_NOT_CHARGED` (`ABORTED`, `ERRORED`, …) is safe to skip; we match
  // on the suffix so new "no charge" kinds keep working without a code edit.
  if (raw.kind && /_NOT_CHARGED$/.test(raw.kind)) return null;

  const inputTokens = safeNumber(raw.tokenUsage?.inputTokens);
  const outputTokens = safeNumber(raw.tokenUsage?.outputTokens);
  const cacheReadTokens = safeNumber(raw.tokenUsage?.cacheReadTokens);
  const cacheWriteTokens = safeNumber(raw.tokenUsage?.cacheWriteTokens);
  const totalTokens =
    inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens;

  // Cursor's own cost in cents → USD. This already accounts for cached vs
  // fresh input tiers, so we don't need to re-price via litellm.
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
    // Tokens come straight from Cursor's billing pipeline — not an estimate.
    estimatedTokens: false,
    sourcePath: "cursor-api",
  };
}

/* ------------------------------------------------------------------ */
/*  Local SQLite fallback                                              */
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

/**
 * Local DB fallback used when the API is unreachable (offline, expired token,
 * etc.). The cursorDiskKV `bubbleId:<composerId>:<bubbleId>` rows hold
 * per-bubble token counts but no timestamp; we join them to their parent
 * `composerData:<composerId>` row to recover a `lastUpdatedAt` timestamp
 * so the bubbles bucket into Session/Today/Week/Month correctly instead of
 * collapsing onto start-of-month.
 */
async function readLocalUsage(
  dbPath: string,
  range: DateRange,
): Promise<{ events: UsageEvent[]; errors: string[] }> {
  const errors: string[] = [];
  if (!existsSync(dbPath)) {
    return { events: [], errors: ["Cursor: no DB"] };
  }

  const uri = `file:${dbPath.replace(/ /g, "%20")}?mode=ro&immutable=1`;

  let composerRows: ComposerRow[] = [];
  try {
    const composerSql = `
      select
        substr(key, instr(key, ':') + 1)                                   as composerId,
        json_extract(cast(value as text), '$.lastUpdatedAt')               as lastUpdatedAt,
        json_extract(cast(value as text), '$.createdAt')                   as createdAt,
        json_extract(cast(value as text), '$.text')                        as title
      from cursorDiskKV
      where key like 'composerData:%'
    `;
    const { stdout } = await execFileAsync(
      "sqlite3",
      ["-json", uri, composerSql],
      { encoding: "utf8", maxBuffer: 1024 * 1024 * 20, timeout: 15000 },
    );
    if (stdout.trim())
      composerRows = JSON.parse(stdout.trim()) as ComposerRow[];
  } catch {
    errors.push("Cursor: composer read error");
    return { events: [], errors };
  }

  const composerTs = new Map<string, number>();
  const composerTitles = new Map<string, string>();
  for (const row of composerRows) {
    const ts = Number(row.lastUpdatedAt ?? row.createdAt ?? NaN);
    if (Number.isFinite(ts) && ts > 0) composerTs.set(row.composerId, ts);
    const title = typeof row.title === "string" ? row.title.trim() : "";
    if (title) composerTitles.set(row.composerId, truncateCursorTitle(title));
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
        and json_extract(cast(value as text), '$.tokenCount.inputTokens') > 0
    `;
    const { stdout } = await execFileAsync(
      "sqlite3",
      ["-json", uri, bubbleSql],
      { encoding: "utf8", maxBuffer: 1024 * 1024 * 50, timeout: 30000 },
    );
    if (stdout.trim()) bubbleRows = JSON.parse(stdout.trim()) as BubbleRow[];
  } catch {
    errors.push("Cursor: bubble read error");
    return { events: [], errors };
  }

  const events: UsageEvent[] = [];
  for (let i = 0; i < bubbleRows.length; i += 1) {
    const row = bubbleRows[i];
    const tsMs = composerTs.get(row.composerId);
    if (!tsMs) continue;
    const timestamp = new Date(tsMs);
    if (!isInRange(timestamp, range.start, range.end)) continue;

    const inputTokens = safeNumber(row.inputTokens);
    const outputTokens = safeNumber(row.outputTokens);
    const cacheReadTokens = safeNumber(row.cacheReadTokens);
    const cacheWriteTokens = safeNumber(row.cacheWriteTokens);
    const totalTokens =
      inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens;
    if (totalTokens <= 0) continue;

    const displayModel = row.modelName || row.model || "cursor-auto";
    const pricingModel = modelForCostEstimate(displayModel);

    events.push({
      id: `cursor:local:${row.composerId}:${i}`,
      provider: "cursor",
      timestamp,
      model: displayModel,
      inputTokens,
      outputTokens,
      cacheReadTokens,
      cacheWriteTokens,
      totalTokens,
      estimatedCost: estimateCost({
        model: pricingModel,
        inputTokens,
        outputTokens,
        cacheReadTokens,
        cacheWriteTokens,
      }),
      // Token counts are accurate but pricing is a local estimate.
      estimatedTokens: true,
      sourcePath: dbPath,
      conversationKey: row.composerId,
      conversationTitle: composerTitles.get(row.composerId),
    });
  }

  if (events.length > 0) errors.push("Cursor: local DB");
  return { events, errors };
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

export async function readCursorUsage(
  basePath: string,
  range: DateRange,
): Promise<{ events: UsageEvent[]; errors: string[] }> {
  const errors: string[] = [];
  const dbPath = cursorDbPath(basePath);

  const token = await readAccessToken(dbPath);
  if (token) {
    const userId = extractUserId(token);
    if (userId) {
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

        // API succeeded — even if the user has no usage yet (e.g. brand new
        // billing month), we return the empty result rather than falling back
        // to potentially stale local-DB bubbles from previous months.
        return { events, errors };
      } catch (err) {
        errors.push(
          `Cursor API: ${err instanceof Error ? err.message : "failed"}`,
        );
      }
    } else {
      errors.push("Cursor: no user id");
    }
  } else if (existsSync(dbPath)) {
    errors.push("Cursor: not signed in");
  }

  const local = await readLocalUsage(dbPath, range);
  return {
    events: local.events,
    errors: [...errors, ...local.errors],
  };
}
