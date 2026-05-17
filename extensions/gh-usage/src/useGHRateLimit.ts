import { useExec } from "@raycast/utils";
import { useEffect } from "react";
import { getGhCommand, getRefreshIntervalMs } from "./preferences";
import {
  RateLimitResponseSchema,
  type RateLimitResource,
  type RateLimitResponse,
} from "./types";

function parseOutput(output: { stdout: string }): RateLimitResponse {
  const json = JSON.parse(output.stdout);
  return RateLimitResponseSchema.parse(json);
}

export function useGHRateLimit() {
  const result = useExec(getGhCommand(), ["api", "rate_limit"], {
    keepPreviousData: true,
    parseOutput,
  });

  const intervalMs = getRefreshIntervalMs();
  useEffect(() => {
    const id = setInterval(() => result.revalidate(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, result.revalidate]);

  const { data, isLoading, error, revalidate } = result;
  return { data, isLoading, error, revalidate };
}

export function formatReset(unixSec: number): string {
  const mins = Math.round((unixSec * 1000 - Date.now()) / 60000);
  if (mins <= 0) return "< 1 min";
  if (mins < 60) return `${mins} min`;
  return `${Math.round(mins / 60)}h`;
}

export function progressBar(used: number, limit: number, width = 12): string {
  const pct = limit === 0 ? 0 : Math.min(used / limit, 1);
  const filled = Math.round(pct * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

export function usagePct(used: number, limit: number): number {
  return limit === 0 ? 0 : Math.round((used / limit) * 100);
}

export function formatAgo(date: Date): string {
  const secs = Math.round((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return "just now";
  return `${Math.round(secs / 60)}m`;
}

export function formatCountdown(atMs: number): string {
  const secs = Math.round((atMs - Date.now()) / 1000);
  if (secs <= 0) return "now";
  if (secs < 60) return `${secs}s`;
  return `${Math.ceil(secs / 60)}m`;
}

function pctStr(r: RateLimitResource): string {
  return String(usagePct(r.used, r.limit));
}

export function buildSubstitutions(
  resources: RateLimitResponse["resources"],
  featured?: RateLimitResource,
): Record<string, string> {
  const { core, graphql, search, code_search, integration_manifest } =
    resources;
  const subs: Record<string, string> = {
    coreRemaining: core.remaining.toLocaleString(),
    coreUsed: core.used.toLocaleString(),
    coreLimit: core.limit.toLocaleString(),
    corePct: pctStr(core),
    graphqlRemaining: graphql.remaining.toLocaleString(),
    graphqlUsed: graphql.used.toLocaleString(),
    graphqlLimit: graphql.limit.toLocaleString(),
    graphqlPct: pctStr(graphql),
    searchRemaining: search.remaining.toLocaleString(),
    searchUsed: search.used.toLocaleString(),
    searchLimit: search.limit.toLocaleString(),
    searchPct: pctStr(search),
    ...(code_search && {
      codeSearchRemaining: code_search.remaining.toLocaleString(),
      codeSearchUsed: code_search.used.toLocaleString(),
      codeSearchLimit: code_search.limit.toLocaleString(),
      codeSearchPct: pctStr(code_search),
    }),
    ...(integration_manifest && {
      integrationRemaining: integration_manifest.remaining.toLocaleString(),
      integrationUsed: integration_manifest.used.toLocaleString(),
      integrationLimit: integration_manifest.limit.toLocaleString(),
      integrationPct: pctStr(integration_manifest),
    }),
  };
  if (featured) {
    const pct = usagePct(featured.used, featured.limit);
    subs.remaining = featured.remaining.toLocaleString();
    subs.used = featured.used.toLocaleString();
    subs.limit = featured.limit.toLocaleString();
    subs.pct = String(pct);
    subs.warning = pct >= 80 ? "⚠ " : "";
  }
  return subs;
}

export function applyTemplate(
  template: string,
  subs: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => subs[key] ?? `{${key}}`);
}
