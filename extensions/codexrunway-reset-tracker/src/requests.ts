import { Cache, environment } from "@raycast/api";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
  rmdirSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import {
  RecordsResponse,
  ResetKind,
  formatDate,
  parseRecords,
  recordsUrl,
} from "./api";

export interface FetchedRecords extends RecordsResponse {
  fetchedAt: number;
  warning?: string;
}

const FRESH_FOR = 2 * 60_000;
const HOUR = 60 * 60_000;
const lockPath = join(environment.supportPath, "request.lock");
const budgetPath = join(environment.supportPath, "request-budget.json");

interface Budget {
  requests: number[];
  retryAt: number;
}

function readBudget(): Budget {
  try {
    const budget = JSON.parse(readFileSync(budgetPath, "utf8")) as Budget;
    if (
      !Array.isArray(budget.requests) ||
      !budget.requests.every(Number.isFinite) ||
      !Number.isFinite(budget.retryAt)
    )
      throw new Error("Invalid request budget");
    return budget;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return { requests: [], retryAt: 0 };
    throw error;
  }
}

function saveBudget(budget: Budget) {
  writeFileSync(`${budgetPath}.tmp`, JSON.stringify(budget));
  renameSync(`${budgetPath}.tmp`, budgetPath);
}

export function retryTime(value: string | null, now = Date.now()): number {
  if (value && /^\d+(\.\d+)?$/.test(value.trim()))
    return now + Number(value) * 1000;
  const date = value ? Date.parse(value) : NaN;
  return Number.isFinite(date) && date > now ? date : now + HOUR;
}

function readCached(url: string): FetchedRecords | undefined {
  // Reopen the cache so writes from another command are visible after waiting.
  const cache = new Cache({ namespace: "records-v1" });
  try {
    return JSON.parse(cache.get(url) ?? "null") ?? undefined;
  } catch {
    cache.remove(url);
    return undefined;
  }
}

/** All commands share this budget and cache, including manual refresh and pagination. */
export async function fetchRecords(url: string): Promise<FetchedRecords> {
  let cached = readCached(url);
  let locked = false;
  try {
    mkdirSync(environment.supportPath, { recursive: true });
    const budget = readBudget();
    if (budget.retryAt > Date.now())
      throw new Error(
        `Request limit reached. Retry after ${formatDate(new Date(budget.retryAt).toISOString())}.`,
      );
    if (cached && Date.now() - cached.fetchedAt < FRESH_FOR) return cached;
    // ponytail: one lock for this 20/hour API; per-service locks if more APIs are added.
    // Outlast the holder's 15s network timeout so a timed-out holder's lock can still be taken.
    const waitUntil = Date.now() + 20_000;
    while (!locked) {
      try {
        mkdirSync(lockPath);
        locked = true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        try {
          // Recover a lock left by a terminated command.
          if (Date.now() - statSync(lockPath).mtimeMs > 60_000) {
            rmdirSync(lockPath);
            continue;
          }
        } catch (lockError) {
          if ((lockError as NodeJS.ErrnoException).code === "ENOENT") continue;
          throw lockError;
        }
        if (Date.now() >= waitUntil)
          throw new Error(
            "Timed out waiting for another command to finish refreshing. Try again shortly.",
          );
        await delay(250);
        cached = readCached(url) ?? cached;
        if (cached && Date.now() - cached.fetchedAt < FRESH_FOR) return cached;
      }
    }
    cached = readCached(url) ?? cached;
    if (cached && Date.now() - cached.fetchedAt < FRESH_FOR) return cached;
    const current = readBudget();
    current.requests = current.requests.filter(
      (time) => time > Date.now() - HOUR,
    );
    if (current.requests.length >= 20)
      current.retryAt = Math.max(current.retryAt, current.requests[0] + HOUR);
    if (current.retryAt > Date.now())
      throw new Error(
        `Request limit reached. Retry after ${formatDate(new Date(current.retryAt).toISOString())}.`,
      );
    current.requests.push(Date.now());
    saveBudget(current);
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (response.status === 429) {
      current.retryAt = retryTime(
        response.headers.get("Retry-After") ??
          response.headers.get("X-RateLimit-Reset"),
      );
      saveBudget(current);
      throw new Error(
        `Request limit reached. Retry after ${formatDate(new Date(current.retryAt).toISOString())}.`,
      );
    }
    if (response.headers.get("X-RateLimit-Remaining") === "0") {
      current.retryAt = retryTime(response.headers.get("X-RateLimit-Reset"));
      saveBudget(current);
    }
    const data = { ...(await parseRecords(response)), fetchedAt: Date.now() };
    new Cache({ namespace: "records-v1" }).set(url, JSON.stringify(data));
    return data;
  } catch (error) {
    if (cached)
      return {
        ...cached,
        warning:
          error instanceof Error ? error.message : "Unable to refresh records",
      };
    throw error;
  } finally {
    if (locked) rmdirSync(lockPath);
  }
}

interface HistoryPage {
  page: number;
  result?: FetchedRecords;
  warning?: string;
}

/** Return failed pages as data so Raycast keeps earlier pages; the cursor retries the same API page. */
export const fetchHistory =
  (kind: ResetKind) =>
  async ({ page, cursor }: { page: number; cursor?: number }) => {
    const apiPage = page === 0 ? 1 : (cursor ?? page + 1);
    let entry: HistoryPage;
    try {
      const result = await fetchRecords(recordsUrl(kind, apiPage));
      entry = { page: apiPage, result, warning: result.warning };
    } catch (error) {
      entry = {
        page: apiPage,
        warning:
          error instanceof Error ? error.message : "Unable to load records",
      };
    }
    return {
      data: [entry],
      hasMore: Boolean(entry.warning || entry.result?.data.hasNext),
      cursor: entry.warning ? apiPage : apiPage + 1,
    };
  };
