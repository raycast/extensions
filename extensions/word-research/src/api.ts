import { webcrypto } from "node:crypto";

const API_BASE = "https://wordresearch.xyz/api";
const PROOF_OF_WORK_PREFIX = "0000";
const RECENT_CHECK_TTL_MS = 5000;
const MAX_POW_ITERATIONS = 500_000;

interface CacheEntry {
  result: CheckResult;
  expiresAt: number;
  timeoutId: ReturnType<typeof setTimeout>;
}

const recentChecks = new Map<string, CacheEntry>();

export interface CheckResult {
  is_new: boolean;
  word: string;
  discovered_at: string;
  search_count: number;
}

export interface TopWord {
  word: string;
  search_count: number;
  discovered_at: string;
}

export interface StatsData {
  total_count: number;
  total_words: number;
  top_words: TopWord[];
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await webcrypto.subtle.digest("SHA-256", new TextEncoder().encode(input));

  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export async function solveProofOfWork(
  word: string,
  signal?: AbortSignal,
): Promise<{ nonce: string; timestamp: number }> {
  const normalizedWord = word.toLowerCase();
  const timestamp = Date.now();

  for (let nonce = 0; nonce < MAX_POW_ITERATIONS; nonce += 1) {
    signal?.throwIfAborted();
    const hash = await sha256Hex(`${normalizedWord}|${timestamp}|${nonce}`);

    if (hash.startsWith(PROOF_OF_WORK_PREFIX)) {
      return { nonce: String(nonce), timestamp };
    }
  }

  throw new Error(`Proof-of-work did not converge within ${MAX_POW_ITERATIONS.toLocaleString()} iterations`);
}

export async function checkWord(word: string, signal?: AbortSignal): Promise<CheckResult> {
  const normalizedWord = word.trim().toLowerCase();
  const now = Date.now();
  const recentCheck = recentChecks.get(normalizedWord);

  if (recentCheck && recentCheck.expiresAt > now) {
    return recentCheck.result;
  }

  const { nonce, timestamp } = await solveProofOfWork(normalizedWord, signal);
  const res = await fetch(`${API_BASE}/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ word: normalizedWord, nonce, timestamp }),
    signal,
  });

  if (!res.ok) {
    let errorMessage = `Request failed (${res.status})`;
    try {
      const errData = (await res.json()) as { error?: string };
      if (errData.error) errorMessage = errData.error;
    } catch {
      // Response body was not JSON (e.g. HTML 502 gateway error) — use status-based message
    }
    throw new Error(errorMessage);
  }

  const result = (await res.json()) as CheckResult;

  // Cancel any previously scheduled expiry for this word before setting a fresh entry
  const existing = recentChecks.get(normalizedWord);
  if (existing) clearTimeout(existing.timeoutId);

  const timeoutId = setTimeout(() => recentChecks.delete(normalizedWord), RECENT_CHECK_TTL_MS);
  recentChecks.set(normalizedWord, { result, expiresAt: Date.now() + RECENT_CHECK_TTL_MS, timeoutId });

  return result;
}

export async function fetchStats(signal?: AbortSignal): Promise<StatsData> {
  const res = await fetch(`${API_BASE}/stats`, { signal });

  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }

  return (await res.json()) as StatsData;
}

function parseApiDate(value: string): Date {
  return new Date(value.includes("T") ? value : value.replace(" ", "T"));
}

export function formatDate(value: string): string {
  return parseApiDate(value).toLocaleString("en-US");
}

export function formatShortDate(value: string): string {
  const date = parseApiDate(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${month}/${day}/${year}`;
}
