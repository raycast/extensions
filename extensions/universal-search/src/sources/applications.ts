import { getApplications, Application } from "@raycast/api";
import { SearchResult, SourceContext, SourceOutput } from "../types";
import { isExcludedPath, matchesAllTerms, parseQuery } from "./util";

let cache: { at: number; apps: Application[] } | null = null;
const CACHE_TTL_MS = 60_000;

async function loadApps(): Promise<Application[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.apps;
  const apps = await getApplications();
  cache = { at: Date.now(), apps };
  return apps;
}

export async function searchApplications(ctx: SourceContext): Promise<SourceOutput> {
  const empty = { results: [] as SearchResult[], total: 0 };
  const parsed = parseQuery(ctx.query);
  // An extension token doesn't make sense for apps — skip the source if one is set.
  if (parsed.extensions.length > 0) return empty;
  if (parsed.terms.length === 0) return empty;

  const apps = await loadApps();
  const excludes = ctx.exclude ?? [];
  const results: SearchResult[] = [];
  let total = 0;
  for (const a of apps) {
    if (ctx.signal.aborted) return empty;
    if (isExcludedPath(a.path, excludes)) continue;
    const hay = [a.name, a.path, a.bundleId ?? ""].join(" ");
    if (!matchesAllTerms(hay, parsed.terms)) continue;
    total++;
    if (results.length >= ctx.limit) continue;
    results.push({
      id: "app:" + a.path,
      kind: "application",
      title: a.name,
      subtitle: a.bundleId,
      path: a.path,
    });
  }
  return { results, total };
}
