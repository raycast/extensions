/**
 * Pure giveaway logic: entry filtering and the draw itself. Ported from the
 * giveaway tool in `threads-analytics`, minus the UI.
 *
 * Must not import `@raycast/api` so it stays unit-testable.
 */
import { randomInt } from "node:crypto";
import type { ThreadsReply } from "./threads-api";

// The lookbehind keeps the domain of an email address from counting as a tag. It is
// ASCII-only on purpose: CJK text runs straight into a mention with no space ("謝謝@amy").
const MENTION_RE = /(?<![a-z0-9._])@[a-z0-9._]+/gi;

export interface GiveawayFilters {
  /** Keep only each account's earliest reply. */
  onePerAccount: boolean;
  /** Drop replies with no text (an image-only reply, for instance). */
  requireText: boolean;
  /** Reply must contain at least one of these, case-insensitively. Empty means no keyword filter. */
  keywords: string[];
  /** Reply must @-mention at least this many accounts. 0 disables the check. */
  minMentions: number;
  /** Only replies posted at or before this moment count. */
  before?: Date;
  /** Accounts that can never win, e.g. the host's friends. Case-insensitive. */
  excludedUsernames: string[];
  /** The host's own handle, which never counts toward `minMentions`. */
  hostUsername?: string;
}

export interface Prize {
  name: string;
  count: number;
}

export interface PrizeResult {
  prize: Prize;
  winners: ThreadsReply[];
}

export interface DrawOutcome {
  results: PrizeResult[];
  /** How many eligible entries the draw was made from. */
  pool: number;
  /** How many distinct accounts won something. */
  won: number;
  /** True when there were fewer eligible accounts than prizes to hand out. */
  shortfall: boolean;
}

/** Splits a comma-separated keyword list; accepts the full-width comma too. */
export function parseKeywords(text: string): string[] {
  return text
    .split(/[,，]/)
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * A non-negative whole number typed into a form field, or `undefined` if the text is
 * anything else. `parseInt` reads a leading number and drops the rest, so "1O" (a
 * letter O) meant as ten prizes quietly became one.
 */
export function parseWholeNumber(text: string): number | undefined {
  const trimmed = text.trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : undefined;
}

/**
 * Distinct accounts a reply tags, ignoring `ignore` (the host).
 *
 * Counting raw matches let "@bob @bob" satisfy "tag two friends", as did tagging the
 * host twice or writing an email address — the condition is about how many different
 * people were brought in, so that is what is counted.
 */
export function countMentions(text: string, ignore: readonly string[] = []): number {
  const ignored = new Set(ignore.map((name) => name.toLowerCase().replace(/^@/, "")));
  const handles = new Set(
    (text.match(MENTION_RE) ?? [])
      // Trailing dots are sentence punctuation ("thanks @amy."). A match that is only
      // dots ("@...") strips to nothing and must not count as an account.
      .map((mention) => mention.slice(1).toLowerCase().replace(/\.+$/, ""))
      .filter(Boolean),
  );
  for (const handle of ignored) handles.delete(handle);
  return handles.size;
}

/**
 * Applies the entry conditions, oldest reply first, so "one entry per account" keeps
 * the reply that entered first rather than whichever the API listed first.
 */
export function filterEntries(replies: readonly ThreadsReply[], filters: GiveawayFilters): ThreadsReply[] {
  let list = [...replies].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  if (filters.excludedUsernames.length > 0) {
    const excluded = new Set(filters.excludedUsernames.map((name) => name.toLowerCase()));
    list = list.filter((reply) => !excluded.has(reply.username.toLowerCase()));
  }

  if (filters.requireText) {
    list = list.filter((reply) => reply.text.trim().length > 0);
  }

  if (filters.keywords.length > 0) {
    list = list.filter((reply) => {
      const text = reply.text.toLowerCase();
      return filters.keywords.some((keyword) => text.includes(keyword));
    });
  }

  if (filters.minMentions > 0) {
    // An entrant tagging the host is not tagging a friend.
    const ignore = filters.hostUsername ? [filters.hostUsername] : [];
    list = list.filter((reply) => countMentions(reply.text, ignore) >= filters.minMentions);
  }

  if (filters.before && !Number.isNaN(filters.before.getTime())) {
    const cutoff = filters.before.getTime();
    list = list.filter((reply) => new Date(reply.timestamp).getTime() <= cutoff);
  }

  if (filters.onePerAccount) {
    const seen = new Set<string>();
    list = list.filter((reply) => {
      const key = reply.username.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  return list;
}

/** Fisher–Yates with a CSPRNG, so a draw can't be predicted from `Math.random` state. */
export function secureShuffle<T>(items: readonly T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Fills prizes in order from a shuffled pool. An account wins at most once across
 * all prizes, even when "one entry per account" is off — a duplicate entry raises
 * the odds, it does not stack prizes.
 */
export function drawWinners(
  entries: readonly ThreadsReply[],
  prizes: readonly Prize[],
  shuffle: <T>(items: readonly T[]) => T[] = secureShuffle,
): DrawOutcome {
  const results: PrizeResult[] = prizes.map((prize) => ({ prize, winners: [] }));
  const won = new Set<string>();
  let slot = 0;

  for (const entry of shuffle(entries)) {
    while (slot < results.length && results[slot].winners.length >= results[slot].prize.count) slot++;
    if (slot >= results.length) break;

    const key = entry.username.toLowerCase();
    if (won.has(key)) continue;
    won.add(key);
    results[slot].winners.push(entry);
  }

  const totalPrizes = prizes.reduce((sum, prize) => sum + prize.count, 0);
  return { results, pool: entries.length, won: won.size, shortfall: won.size < totalPrizes };
}

/** Plain-text summary suitable for pasting into a Threads post or a DM. */
export function formatResults(results: readonly PrizeResult[]): string {
  return results
    .map(
      (result) =>
        `🎁 ${result.prize.name} × ${result.winners.length}\n` +
        result.winners.map((winner, index) => `${index + 1}. @${winner.username}`).join("\n"),
    )
    .join("\n\n");
}
