import { webcrypto } from "node:crypto";

const API_BASE = "https://wordresearch.xyz/api";
const PROOF_OF_WORK_PREFIX = "0000";
const RECENT_CHECK_TTL_MS = 5000;

const inFlightChecks = new Map<string, Promise<CheckResult>>();
const recentChecks = new Map<string, { result: CheckResult; expiresAt: number }>();

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

  for (let nonce = 0; ; nonce += 1) {
    signal?.throwIfAborted();
    const hash = await sha256Hex(`${normalizedWord}|${timestamp}|${nonce}`);

    if (hash.startsWith(PROOF_OF_WORK_PREFIX)) {
      return { nonce: String(nonce), timestamp };
    }
  }
}

export async function checkWord(word: string, signal?: AbortSignal): Promise<CheckResult> {
  const normalizedWord = word.trim().toLowerCase();
  const now = Date.now();
  const recentCheck = recentChecks.get(normalizedWord);

  if (recentCheck && recentCheck.expiresAt > now) {
    return recentCheck.result;
  }

  const existingCheck = inFlightChecks.get(normalizedWord);

  if (existingCheck) {
    return existingCheck;
  }

  const request = (async () => {
    const { nonce, timestamp } = await solveProofOfWork(normalizedWord, signal);
    const res = await fetch(`${API_BASE}/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word: normalizedWord, nonce, timestamp }),
      signal,
    });
    const data = (await res.json()) as CheckResult | { error?: string };

    if (!res.ok) {
      throw new Error(("error" in data && data.error) || `Request failed (${res.status})`);
    }

    const result = data as CheckResult;
    recentChecks.set(normalizedWord, {
      result,
      expiresAt: Date.now() + RECENT_CHECK_TTL_MS,
    });

    return result;
  })();

  inFlightChecks.set(normalizedWord, request);

  try {
    return await request;
  } finally {
    inFlightChecks.delete(normalizedWord);
  }
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
