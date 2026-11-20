/**
 * Ranking for the application and ApplicationSet lists.
 *
 * The corpus is a few thousand rows across every instance and this runs on every keystroke, so
 * the loop allocates nothing beyond a number per row and reads a haystack that was lowercased
 * once at projection time.
 *
 * There is deliberately no fuzzy subsequence matching. It is measurably slower, and on names
 * shaped like `team-a-redis-cache` it mostly produces confident nonsense: a substring match on
 * the name is what an operator actually means.
 */

import { isAttentionWorthy } from "../model/status";
import type { AppSummary } from "../argocd/types";

export interface Rankable {
  name: string;
  haystack: string;
}

export interface RankResult<T> {
  items: T[];
  truncated: boolean;
  total: number;
}

export interface RankOptions {
  limit: number;
}

const SCORE_EXACT = 1000;
const SCORE_PREFIX = 500;
const SCORE_NAME_SUBSTRING = 250;
const SCORE_HAYSTACK = 100;
/** A shorter name containing the query is the better match, so length is a small penalty. */
const LENGTH_PENALTY = 0.1;

export function appKey(app: AppSummary): string {
  return `${app.instanceId}/${app.namespace}/${app.name}`;
}

function scoreTerm(item: Rankable, term: string): number {
  const name = item.name.toLowerCase();
  if (name === term) {
    return SCORE_EXACT;
  }
  if (name.startsWith(term)) {
    return SCORE_PREFIX - Math.min(name.length * LENGTH_PENALTY, 50);
  }
  if (name.includes(term)) {
    return SCORE_NAME_SUBSTRING - Math.min(name.length * LENGTH_PENALTY, 50);
  }
  if (item.haystack.includes(term)) {
    return SCORE_HAYSTACK;
  }
  return 0;
}

/**
 * Multi-word queries are AND: every word has to match something, which is what makes
 * "team-a redis" a useful way to narrow down thousands of rows.
 */
export function scoreItem(item: Rankable, query: string): number {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    return 0;
  }

  let total = 0;
  for (const term of terms) {
    const score = scoreTerm(item, term);
    if (score === 0) {
      return 0;
    }
    total += score;
  }
  return total;
}

export function scoreApp(app: AppSummary, query: string): number {
  return scoreItem(app, query);
}

function rank<T extends Rankable>(items: T[], query: string, limit: number): RankResult<T> {
  const scored: { item: T; score: number }[] = [];
  for (const item of items) {
    const score = scoreItem(item, query);
    if (score > 0) {
      scored.push({ item, score });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name));

  return {
    items: scored.slice(0, limit).map((entry) => entry.item),
    truncated: scored.length > limit,
    total: scored.length,
  };
}

export function rankApps(apps: AppSummary[], query: string, options: RankOptions): RankResult<AppSummary> {
  return rank(apps, query, options.limit);
}

export function rankAppSets<T extends Rankable>(sets: T[], query: string, limit: number): RankResult<T> {
  return rank(sets, query, limit);
}

/**
 * What an operator sees before typing anything. Recently opened first, then whatever needs
 * attention, then the rest: "the first sixty names alphabetically" is never the useful answer.
 */
export function defaultOrder(apps: AppSummary[], recentKeys: string[], limit: number): RankResult<AppSummary> {
  const byKey = new Map(apps.map((app) => [appKey(app), app]));
  const seen = new Set<string>();

  const recent: AppSummary[] = [];
  for (const key of recentKeys) {
    const app = byKey.get(key);
    if (app && !seen.has(key)) {
      seen.add(key);
      recent.push(app);
    }
  }

  const attention: AppSummary[] = [];
  const rest: AppSummary[] = [];
  for (const app of apps) {
    if (seen.has(appKey(app))) {
      continue;
    }
    (isAttentionWorthy(app.health, app.sync) ? attention : rest).push(app);
  }

  const byName = (a: AppSummary, b: AppSummary) => a.name.localeCompare(b.name);
  attention.sort(byName);
  rest.sort(byName);

  const ordered = [...recent, ...attention, ...rest];
  return { items: ordered.slice(0, limit), truncated: ordered.length > limit, total: ordered.length };
}
