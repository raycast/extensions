import { LocalStorage } from "@raycast/api";
import { LearnedLinkPattern } from "./types";
import { LEARNED_PATTERN_MAX_AGE_DAYS, LEARNED_PATTERN_VERSION } from "./constants";

const LEARNED_PATTERNS_KEY = "otp-inbox-learned-link-patterns";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isExpired(pattern: LearnedLinkPattern): boolean {
  const cutoff = Date.now() - LEARNED_PATTERN_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  return new Date(pattern.lastUsedAt).getTime() < cutoff;
}

export async function getLearnedPatterns(): Promise<LearnedLinkPattern[]> {
  try {
    const raw = await LocalStorage.getItem<string>(LEARNED_PATTERNS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const valid: LearnedLinkPattern[] = [];
    for (const item of parsed) {
      if (typeof item === "object" && item !== null && item.version === LEARNED_PATTERN_VERSION) {
        valid.push(item as LearnedLinkPattern);
      }
    }

    const pruned = valid.filter((p) => !isExpired(p));
    if (pruned.length !== valid.length) {
      await setLearnedPatterns(pruned);
    }
    return pruned;
  } catch {
    return [];
  }
}

async function setLearnedPatterns(patterns: LearnedLinkPattern[]): Promise<void> {
  await LocalStorage.setItem(LEARNED_PATTERNS_KEY, JSON.stringify(patterns));
}

export interface PatternInput {
  senderAddress: string;
  senderRegistrableDomain: string;
  targetHostname: string;
  normalizedCtaText: string;
  pathSignature: string;
}

export async function rememberPattern(input: PatternInput): Promise<LearnedLinkPattern> {
  const patterns = await getLearnedPatterns();
  const now = new Date().toISOString();

  const existingIndex = patterns.findIndex(
    (p) =>
      p.senderAddress.toLowerCase() === input.senderAddress.toLowerCase() &&
      p.targetHostname === input.targetHostname &&
      p.normalizedCtaText === input.normalizedCtaText &&
      p.pathSignature === input.pathSignature,
  );

  if (existingIndex >= 0) {
    const existing = patterns[existingIndex];
    existing.lastUsedAt = now;
    existing.useCount += 1;
    await setLearnedPatterns(patterns);
    return existing;
  }

  const pattern: LearnedLinkPattern = {
    version: LEARNED_PATTERN_VERSION,
    id: generateId(),
    senderAddress: input.senderAddress.trim().toLowerCase(),
    senderRegistrableDomain: input.senderRegistrableDomain,
    targetHostname: input.targetHostname,
    normalizedCtaText: input.normalizedCtaText,
    pathSignature: input.pathSignature,
    createdAt: now,
    lastUsedAt: now,
    useCount: 1,
  };

  await setLearnedPatterns([...patterns, pattern]);
  return pattern;
}

export async function forgetPattern(id: string): Promise<void> {
  const patterns = await getLearnedPatterns();
  const filtered = patterns.filter((p) => p.id !== id);
  await setLearnedPatterns(filtered);
}

export async function forgetAllPatterns(): Promise<void> {
  await LocalStorage.removeItem(LEARNED_PATTERNS_KEY);
}
